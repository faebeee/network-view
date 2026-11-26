import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
} from '@nestjs/common';
import {
  MIN_SCAN_PREFIX_LENGTH,
  type NetworkInterfaceInfo,
  type ScanSummary,
  type StartScanOptions,
} from '@network-view/contracts';
import { mapConcurrent } from '../../shared/async/concurrency.js';
import {
  formatCidr,
  hostAddresses,
  hostCount,
  parseCidr,
  rangeContains,
  rangeFor,
  type Ipv4Range,
} from '../../shared/net/ipv4.js';
import { isLocallyAdministeredMac } from '../../shared/net/mac.js';
import { ScanSession, type ScanTarget } from './domain/scan-session.js';
import { GatewayResolver, type DefaultGateway } from './probes/gateway.resolver.js';
import { HostnameResolver } from './probes/hostname.resolver.js';
import { IcmpProbe } from './probes/icmp.probe.js';
import { MacVendorLookup } from './probes/mac-vendor.lookup.js';
import { NeighborTable } from './probes/neighbor-table.js';
import { NetworkInterfacesProvider } from './probes/network-interfaces.provider.js';
import { TcpProbe } from './probes/tcp.probe.js';

/** Interface subnets larger than this are narrowed to the /24 around the local address. */
const DEFAULT_MAX_INTERFACE_PREFIX = 22;
const PROBE_CONCURRENCY = 64;
const HOSTNAME_CONCURRENCY = 8;
const ICMP_TIMEOUT_MS = 1000;
const MAX_RETAINED_SCANS = 20;

@Injectable()
export class NetworkDiscoveryService implements OnModuleDestroy {
  private readonly logger = new Logger(NetworkDiscoveryService.name);
  private readonly scans = new Map<string, ScanSession>();

  constructor(
    private readonly interfaces: NetworkInterfacesProvider,
    private readonly gateways: GatewayResolver,
    private readonly icmp: IcmpProbe,
    private readonly tcp: TcpProbe,
    private readonly neighbors: NeighborTable,
    private readonly hostnames: HostnameResolver,
    private readonly vendors: MacVendorLookup,
  ) {}

  async listInterfaces(): Promise<NetworkInterfaceInfo[]> {
    return this.interfaces.list(await this.gateways.getDefaultGateway());
  }

  listScans(): ScanSummary[] {
    return [...this.scans.values()]
      .map((session) => {
        const { hosts: _hosts, ...summary } = session.snapshot();
        return summary;
      })
      .sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  }

  getScan(id: string): ScanSession {
    const session = this.scans.get(id);
    if (!session) throw new NotFoundException(`Scan ${id} not found`);
    return session;
  }

  async startScan(options: StartScanOptions): Promise<ScanSession> {
    const gateway = await this.gateways.getDefaultGateway();
    const iface = this.selectInterface(this.interfaces.list(gateway), options.interfaceName);
    const { range, notice } = this.resolveRange(iface, options.cidr);
    const target: ScanTarget = {
      interfaceName: iface.name,
      cidr: formatCidr(range),
      total: hostCount(range),
      notice,
    };

    const session = new ScanSession(target);
    this.retain(session);
    this.logger.log(`Scan ${session.id} started on ${iface.name} for ${target.cidr}`);

    this.execute(session, iface, range, gateway, options).then(
      () => session.finish(session.signal.aborted ? 'cancelled' : 'completed'),
      (error: Error) => {
        this.logger.error(`Scan ${session.id} failed: ${error.message}`, error.stack);
        session.finish('failed', error.message);
      },
    );
    return session;
  }

  cancelScan(id: string): ScanSession {
    const session = this.getScan(id);
    session.abortController.abort();
    return session;
  }

  onModuleDestroy(): void {
    for (const session of this.scans.values()) session.abortController.abort();
  }

  private async execute(
    session: ScanSession,
    iface: NetworkInterfaceInfo,
    range: Ipv4Range,
    gateway: DefaultGateway | null,
    options: StartScanOptions,
  ): Promise<void> {
    const { signal } = session;

    if (rangeContains(range, iface.address)) {
      session.upsertHost({ ip: iface.address, source: 'self', mac: iface.mac, isSelf: true });
    }

    // 1. Active sweep. Every probe also makes the OS resolve the address via ARP.
    let probed = 0;
    await mapConcurrent(
      hostAddresses(range),
      PROBE_CONCURRENCY,
      async (ip) => {
        if (ip !== iface.address) {
          const ping = await this.icmp.probe(ip, ICMP_TIMEOUT_MS, signal).catch(() => null);
          if (ping?.alive) {
            session.upsertHost({ ip, source: 'icmp', latencyMs: ping.latencyMs });
          } else if (options.tcpProbe && !signal.aborted) {
            const tcp = await this.tcp.probe(ip);
            if (tcp.alive) session.upsertHost({ ip, source: 'tcp', latencyMs: tcp.latencyMs });
          }
        }
        session.updateProgress({ probed: ++probed });
      },
      signal,
    );
    if (signal.aborted) return;

    // 2. Passive: the neighbour cache reveals hosts that ignored every probe.
    session.updateProgress({ phase: 'neighbors' });
    for (const neighbor of await this.neighbors.read()) {
      if (!rangeContains(range, neighbor.ip)) continue;
      if (neighbor.interfaceName && neighbor.interfaceName !== iface.name) continue;
      session.upsertHost({ ip: neighbor.ip, source: 'arp', mac: neighbor.mac });
    }
    for (const ip of session.hostIps()) {
      const mac = session.getHost(ip)?.mac;
      session.upsertHost({
        ip,
        isGateway: ip === gateway?.ip,
        vendor: mac ? this.vendors.lookup(mac) : null,
        randomizedMac: mac ? isLocallyAdministeredMac(mac) : false,
      });
    }
    if (signal.aborted || !options.resolveHostnames) return;

    // 3. Names for everything that was found.
    const ips = session.hostIps();
    session.updateProgress({ phase: 'hostnames', probed: 0, total: ips.length });
    let resolved = 0;
    await mapConcurrent(
      ips,
      HOSTNAME_CONCURRENCY,
      async (ip) => {
        const hostname = await this.hostnames.resolve(ip);
        if (hostname) session.upsertHost({ ip, hostname });
        session.updateProgress({ probed: ++resolved });
      },
      signal,
    );
  }

  private selectInterface(
    available: NetworkInterfaceInfo[],
    requested: string | undefined,
  ): NetworkInterfaceInfo {
    if (available.length === 0) {
      throw new BadRequestException('No IPv4 network interface is available for scanning');
    }
    if (!requested) return available.find((iface) => iface.isDefault) ?? available[0]!;
    const match = available.find((iface) => iface.name === requested);
    if (!match) throw new BadRequestException(`Unknown network interface: ${requested}`);
    return match;
  }

  private resolveRange(
    iface: NetworkInterfaceInfo,
    cidr: string | undefined,
  ): { range: Ipv4Range; notice: string | null } {
    if (cidr) {
      const range = parseCidr(cidr);
      if (range.prefixLength < MIN_SCAN_PREFIX_LENGTH) {
        throw new BadRequestException(
          `Range too large: use a prefix of /${MIN_SCAN_PREFIX_LENGTH} or longer`,
        );
      }
      return { range, notice: null };
    }
    if (iface.prefixLength < DEFAULT_MAX_INTERFACE_PREFIX) {
      const range = rangeFor(iface.address, 24);
      return {
        range,
        notice: `The subnet ${iface.cidr} is large, so only ${formatCidr(range)} was scanned. Enter a range to scan a different part.`,
      };
    }
    return { range: rangeFor(iface.address, iface.prefixLength), notice: null };
  }

  private retain(session: ScanSession): void {
    this.scans.set(session.id, session);
    const finished = [...this.scans.values()].filter((scan) => !scan.isRunning);
    for (const old of finished.slice(0, Math.max(0, this.scans.size - MAX_RETAINED_SCANS))) {
      this.scans.delete(old.id);
    }
  }
}
