import { Injectable } from '@nestjs/common';
import { networkInterfaces } from 'node:os';
import type { NetworkInterfaceInfo } from '@network-view/contracts';
import {
  formatCidr,
  prefixLengthFromNetmask,
  rangeContains,
  rangeFor,
} from '../../../shared/net/ipv4.js';
import { normalizeMac } from '../../../shared/net/mac.js';
import type { DefaultGateway } from './gateway.resolver.js';

/** Lists the IPv4 interfaces of this machine that can be scanned. */
@Injectable()
export class NetworkInterfacesProvider {
  list(gateway: DefaultGateway | null): NetworkInterfaceInfo[] {
    const result: NetworkInterfaceInfo[] = [];
    for (const [name, addresses] of Object.entries(networkInterfaces())) {
      for (const address of addresses ?? []) {
        if (address.family !== 'IPv4' || address.internal) continue;
        // Skip link-local (APIPA) addresses; they rarely hold anything worth scanning.
        if (address.address.startsWith('169.254.')) continue;
        const prefixLength = prefixLengthFromNetmask(address.netmask);
        const range = rangeFor(address.address, prefixLength);
        result.push({
          name,
          address: address.address,
          netmask: address.netmask,
          prefixLength,
          cidr: formatCidr(range),
          mac: normalizeMac(address.mac),
          isDefault: gateway
            ? gateway.interfaceName
              ? name === gateway.interfaceName
              : rangeContains(range, gateway.ip)
            : false,
        });
      }
    }
    return result.sort((a, b) => Number(b.isDefault) - Number(a.isDefault));
  }
}
