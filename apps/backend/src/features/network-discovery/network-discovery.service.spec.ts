import { Test } from '@nestjs/testing';
import { firstValueFrom, lastValueFrom, toArray } from 'rxjs';
import type { NetworkInterfaceInfo, ScanEvent } from '@network-view/contracts';
import { NetworkDiscoveryService } from './network-discovery.service.js';
import { GatewayResolver } from './probes/gateway.resolver.js';
import { HostnameResolver } from './probes/hostname.resolver.js';
import { IcmpProbe } from './probes/icmp.probe.js';
import { MacVendorLookup } from './probes/mac-vendor.lookup.js';
import { NeighborTable } from './probes/neighbor-table.js';
import { NetworkInterfacesProvider } from './probes/network-interfaces.provider.js';
import { TcpProbe } from './probes/tcp.probe.js';

const iface: NetworkInterfaceInfo = {
  name: 'en0',
  address: '10.0.0.10',
  netmask: '255.255.255.248',
  prefixLength: 29,
  cidr: '10.0.0.8/29',
  mac: 'a4:83:e7:00:00:10',
  isDefault: true,
};

async function createService(interfaces: NetworkInterfaceInfo[] = [iface]) {
  const moduleRef = await Test.createTestingModule({
    providers: [
      NetworkDiscoveryService,
      { provide: NetworkInterfacesProvider, useValue: { list: () => interfaces } },
      {
        provide: GatewayResolver,
        useValue: { getDefaultGateway: async () => ({ ip: '10.0.0.9', interfaceName: 'en0' }) },
      },
      {
        provide: IcmpProbe,
        useValue: {
          probe: async (ip: string) =>
            ip === '10.0.0.9' ? { alive: true, latencyMs: 1.5 } : { alive: false, latencyMs: null },
        },
      },
      {
        provide: TcpProbe,
        useValue: {
          probe: async (ip: string) =>
            ip === '10.0.0.11' ? { alive: true, latencyMs: 4 } : { alive: false, latencyMs: null },
        },
      },
      {
        provide: NeighborTable,
        useValue: {
          read: async () => [
            { ip: '10.0.0.9', mac: '00:11:22:33:44:55', interfaceName: 'en0' },
            { ip: '10.0.0.12', mac: 'da:00:00:00:00:12', interfaceName: 'en0' },
            { ip: '10.0.0.13', mac: '00:00:00:00:00:13', interfaceName: 'en1' },
            { ip: '192.168.5.5', mac: '00:00:00:00:00:55', interfaceName: 'en0' },
          ],
        },
      },
      {
        provide: HostnameResolver,
        useValue: { resolve: async (ip: string) => (ip === '10.0.0.9' ? 'router.local' : null) },
      },
      {
        provide: MacVendorLookup,
        useValue: { lookup: (mac: string) => (mac.startsWith('00:11:22') ? 'ACME' : null) },
      },
    ],
  }).compile();
  return moduleRef.get(NetworkDiscoveryService);
}

describe('NetworkDiscoveryService', () => {
  it('combines ping, TCP, neighbour table and hostname results', async () => {
    const service = await createService();
    const session = await service.startScan({ tcpProbe: true, resolveHostnames: true });
    const events = await lastValueFrom(session.stream().pipe(toArray()));
    const scan = session.snapshot();

    expect(scan.status).toBe('completed');
    expect(scan.cidr).toBe('10.0.0.8/29');
    expect(scan.hosts.map((host) => host.ip)).toEqual([
      '10.0.0.9',
      '10.0.0.10',
      '10.0.0.11',
      '10.0.0.12',
    ]);

    const gateway = scan.hosts[0]!;
    expect(gateway).toMatchObject({
      isGateway: true,
      mac: '00:11:22:33:44:55',
      vendor: 'ACME',
      hostname: 'router.local',
      latencyMs: 1.5,
      sources: ['icmp', 'arp'],
    });
    expect(scan.hosts[1]).toMatchObject({ isSelf: true, sources: ['self'] });
    expect(scan.hosts[2]).toMatchObject({ sources: ['tcp'], latencyMs: 4 });
    expect(scan.hosts[3]).toMatchObject({ sources: ['arp'], randomizedMac: true });

    expect(events[0]?.type).toBe('snapshot');
    expect(events.at(-1)).toMatchObject<Partial<ScanEvent>>({ type: 'status', status: 'completed' });
  });

  it('skips TCP probes and hostnames when disabled', async () => {
    const service = await createService();
    const session = await service.startScan({ tcpProbe: false, resolveHostnames: false });
    await lastValueFrom(session.stream());
    const ips = session.snapshot().hosts.map((host) => host.ip);
    expect(ips).not.toContain('10.0.0.11');
    expect(session.snapshot().hosts.every((host) => host.hostname === null)).toBe(true);
  });

  it('narrows large interface subnets to a /24', async () => {
    const service = await createService([
      { ...iface, prefixLength: 16, netmask: '255.255.0.0', cidr: '10.0.0.0/16' },
    ]);
    const session = await service.startScan({ tcpProbe: false, resolveHostnames: false });
    session.abortController.abort();
    const snapshot = await firstValueFrom(session.stream());
    expect(snapshot.type === 'snapshot' && snapshot.scan.cidr).toBe('10.0.0.0/24');
    expect(session.snapshot().notice).toContain('10.0.0.0/16');
  });

  it('rejects ranges that are too large or unknown interfaces', async () => {
    const service = await createService();
    await expect(
      service.startScan({ cidr: '10.0.0.0/8', tcpProbe: false, resolveHostnames: false }),
    ).rejects.toThrow(/too large/);
    await expect(
      service.startScan({ interfaceName: 'wlan9', tcpProbe: false, resolveHostnames: false }),
    ).rejects.toThrow(/Unknown network interface/);
  });

  it('cancels a running scan', async () => {
    const service = await createService();
    const session = await service.startScan({
      cidr: '10.0.0.0/22',
      tcpProbe: false,
      resolveHostnames: false,
    });
    service.cancelScan(session.id);
    await lastValueFrom(session.stream());
    expect(session.snapshot().status).toBe('cancelled');
  });
});
