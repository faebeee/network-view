import { Injectable } from '@nestjs/common';
import { runCommand } from '../../../shared/system/run-command.js';

export interface IcmpResult {
  alive: boolean;
  latencyMs: number | null;
}

/** Builds platform specific arguments for a single ping. */
export function pingArgs(platform: NodeJS.Platform, ip: string, timeoutMs: number): string[] {
  switch (platform) {
    case 'win32':
      return ['-n', '1', '-w', String(timeoutMs), ip];
    case 'darwin':
    case 'freebsd':
    case 'openbsd':
      // BSD ping: -W is the wait time in milliseconds.
      return ['-c', '1', '-W', String(timeoutMs), ip];
    default:
      // Linux (iputils/busybox): -W is the wait time in whole seconds.
      return ['-c', '1', '-W', String(Math.max(1, Math.ceil(timeoutMs / 1000))), ip];
  }
}

export function parsePingLatency(output: string): number | null {
  const match = /time[=<]\s*([\d.]+)\s*ms/i.exec(output);
  return match ? Number(match[1]) : null;
}

/** Uses the system `ping` binary, which works without root privileges. */
@Injectable()
export class IcmpProbe {
  async probe(ip: string, timeoutMs: number, signal?: AbortSignal): Promise<IcmpResult> {
    const result = await runCommand('ping', pingArgs(process.platform, ip, timeoutMs), {
      timeoutMs: timeoutMs + 1500,
      signal,
    });
    // Windows returns 0 for "Destination host unreachable" replies from the local stack.
    const alive =
      result.exitCode === 0 && (process.platform !== 'win32' || /TTL=/i.test(result.stdout));
    return { alive, latencyMs: alive ? parsePingLatency(result.stdout) : null };
  }
}
