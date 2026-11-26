import { Injectable, Logger } from '@nestjs/common';
import { readFile } from 'node:fs/promises';
import { normalizeMac } from '../../../shared/net/mac.js';
import { isIpv4 } from '../../../shared/net/ipv4.js';
import { runCommand } from '../../../shared/system/run-command.js';

export interface NeighborEntry {
  ip: string;
  mac: string;
  interfaceName: string | null;
}

function entry(ip: string, rawMac: string, interfaceName: string | null): NeighborEntry | null {
  const mac = normalizeMac(rawMac);
  return mac && isIpv4(ip) ? { ip, mac, interfaceName } : null;
}

function compact<T>(items: Array<T | null>): T[] {
  return items.filter((item): item is T => item !== null);
}

/** macOS / BSD `arp -an`: `? (192.168.1.1) at 0:11:22:33:44:55 on en0 ifscope [ethernet]` */
export function parseBsdArp(output: string): NeighborEntry[] {
  const pattern = /\((\d+\.\d+\.\d+\.\d+)\) at ([0-9a-f:]+) on (\S+)/i;
  return compact(
    output.split('\n').map((line) => {
      const match = pattern.exec(line);
      return match ? entry(match[1]!, match[2]!, match[3]!) : null;
    }),
  );
}

/** Linux `/proc/net/arp`: `IP  HW-type  Flags  HW-address  Mask  Device` */
export function parseProcNetArp(output: string): NeighborEntry[] {
  return compact(
    output
      .split('\n')
      .slice(1)
      .map((line) => {
        const [ip, , flags, mac, , device] = line.trim().split(/\s+/);
        // Flag 0x2 (ATF_COM) marks a completed entry.
        if (!ip || !mac || !flags || (parseInt(flags, 16) & 0x2) === 0) return null;
        return entry(ip, mac, device ?? null);
      }),
  );
}

/** Windows `arp -a`: `  192.168.1.1          aa-bb-cc-dd-ee-ff     dynamic` */
export function parseWindowsArp(output: string): NeighborEntry[] {
  const pattern = /^\s*(\d+\.\d+\.\d+\.\d+)\s+([0-9a-f]{2}(?:-[0-9a-f]{2}){5})\s+\w+/i;
  return compact(
    output.split('\n').map((line) => {
      const match = pattern.exec(line);
      return match ? entry(match[1]!, match[2]!, null) : null;
    }),
  );
}

/**
 * Reads the operating system's ARP / neighbour cache. After a sweep it contains
 * every host that answered ARP, including hosts that ignore ICMP and TCP.
 */
@Injectable()
export class NeighborTable {
  private readonly logger = new Logger(NeighborTable.name);

  async read(): Promise<NeighborEntry[]> {
    try {
      switch (process.platform) {
        case 'linux':
          return parseProcNetArp(await readFile('/proc/net/arp', 'utf8'));
        case 'win32':
          return parseWindowsArp((await runCommand('arp', ['-a'], { timeoutMs: 5000 })).stdout);
        default:
          return parseBsdArp((await runCommand('arp', ['-an'], { timeoutMs: 5000 })).stdout);
      }
    } catch (error) {
      this.logger.warn(`Could not read the neighbour table: ${(error as Error).message}`);
      return [];
    }
  }
}
