import { Injectable } from '@nestjs/common';
import { promises as dns } from 'node:dns';
import { isIpv4 } from '../../../shared/net/ipv4.js';
import { withTimeout } from '../../../shared/async/concurrency.js';

@Injectable()
export class HostnameResolver {
  /**
   * Uses the system resolver (getnameinfo), which also covers mDNS / Bonjour
   * names such as `printer.local` on macOS, then falls back to reverse DNS.
   */
  async resolve(ip: string, timeoutMs = 2000): Promise<string | null> {
    const viaSystem = await withTimeout(
      dns.lookupService(ip, 0).then(({ hostname }) => hostname, () => null),
      timeoutMs,
      null,
    );
    if (viaSystem && !isIpv4(viaSystem)) return viaSystem;

    const viaDns = await withTimeout(
      dns.reverse(ip).then((names) => names[0] ?? null, () => null),
      timeoutMs,
      null,
    );
    return viaDns ?? null;
  }
}
