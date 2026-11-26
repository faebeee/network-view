import type { FeatureDefinition } from '../../shared/lib/feature'
import { NetworkDiscoveryIcon } from './components/NetworkDiscoveryIcon'

export const networkDiscoveryFeature = {
  id: 'network-discovery',
  title: 'Network Discovery',
  description: 'Find every host on your local network with ping, TCP probes and the ARP cache.',
  path: '/network-discovery',
  icon: NetworkDiscoveryIcon,
} as const satisfies FeatureDefinition
