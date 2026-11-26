import { Injectable, Logger } from '@nestjs/common';
import { isIpv4 } from '../../../shared/net/ipv4.js';
import { runCommand } from '../../../shared/system/run-command.js';

export interface DefaultGateway {
  ip: string;
  interfaceName: string | null;
}

/** macOS `route -n get default` */
export function parseBsdRoute(output: string): DefaultGateway | null {
  const ip = /gateway:\s*(\S+)/.exec(output)?.[1];
  const interfaceName = /interface:\s*(\S+)/.exec(output)?.[1] ?? null;
  return ip && isIpv4(ip) ? { ip, interfaceName } : null;
}

/** Linux `ip -4 route show default`: `default via 192.168.1.1 dev eth0 proto dhcp ...` */
export function parseIpRoute(output: string): DefaultGateway | null {
  const match = /default via (\S+)(?: dev (\S+))?/.exec(output);
  return match && isIpv4(match[1]!) ? { ip: match[1]!, interfaceName: match[2] ?? null } : null;
}

/** Windows `route print -4 0.0.0.0`: `0.0.0.0  0.0.0.0  192.168.1.1  192.168.1.23  25` */
export function parseWindowsRoute(output: string): DefaultGateway | null {
  const match = /^\s*0\.0\.0\.0\s+0\.0\.0\.0\s+(\d+\.\d+\.\d+\.\d+)\s+/m.exec(output);
  return match ? { ip: match[1]!, interfaceName: null } : null;
}

@Injectable()
export class GatewayResolver {
  private readonly logger = new Logger(GatewayResolver.name);

  async getDefaultGateway(): Promise<DefaultGateway | null> {
    try {
      switch (process.platform) {
        case 'linux':
          return parseIpRoute(
            (await runCommand('ip', ['-4', 'route', 'show', 'default'], { timeoutMs: 3000 }))
              .stdout,
          );
        case 'win32':
          return parseWindowsRoute(
            (await runCommand('route', ['print', '-4', '0.0.0.0'], { timeoutMs: 3000 })).stdout,
          );
        default:
          return parseBsdRoute(
            (await runCommand('route', ['-n', 'get', 'default'], { timeoutMs: 3000 })).stdout,
          );
      }
    } catch (error) {
      this.logger.warn(`Could not determine the default gateway: ${(error as Error).message}`);
      return null;
    }
  }
}
