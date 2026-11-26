import { Module } from '@nestjs/common';
import { NetworkDiscoveryController } from './network-discovery.controller.js';
import { NetworkDiscoveryService } from './network-discovery.service.js';
import { GatewayResolver } from './probes/gateway.resolver.js';
import { HostnameResolver } from './probes/hostname.resolver.js';
import { IcmpProbe } from './probes/icmp.probe.js';
import { MacVendorLookup } from './probes/mac-vendor.lookup.js';
import { NeighborTable } from './probes/neighbor-table.js';
import { NetworkInterfacesProvider } from './probes/network-interfaces.provider.js';
import { TcpProbe } from './probes/tcp.probe.js';

/** Finds the hosts on a local IPv4 network (ping sweep, TCP probes, ARP cache, hostnames). */
@Module({
  controllers: [NetworkDiscoveryController],
  providers: [
    NetworkDiscoveryService,
    NetworkInterfacesProvider,
    GatewayResolver,
    IcmpProbe,
    TcpProbe,
    NeighborTable,
    HostnameResolver,
    MacVendorLookup,
  ],
  exports: [NetworkDiscoveryService],
})
export class NetworkDiscoveryModule {}
