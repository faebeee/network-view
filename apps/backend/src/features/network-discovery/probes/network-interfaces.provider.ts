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

/** Virtual interfaces created by container runtimes and hypervisors; their "networks" are not LANs. */
const VIRTUAL_INTERFACE_PATTERN = /^(podman|cni|veth|docker|br-|virbr|vmnet|cali|flannel|cilium|vxlan|tailscale|utun)/;

export function isScannableInterface(name: string, address: string): boolean {
  // Link-local (APIPA) addresses rarely hold anything worth scanning.
  return !VIRTUAL_INTERFACE_PATTERN.test(name) && !address.startsWith('169.254.');
}

/** Lists the IPv4 interfaces of this machine that can be scanned. */
@Injectable()
export class NetworkInterfacesProvider {
  list(gateway: DefaultGateway | null): NetworkInterfaceInfo[] {
    const result: NetworkInterfaceInfo[] = [];
    for (const [name, addresses] of Object.entries(networkInterfaces())) {
      for (const address of addresses ?? []) {
        if (address.family !== 'IPv4' || address.internal) continue;
        if (!isScannableInterface(name, address.address)) continue;
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
