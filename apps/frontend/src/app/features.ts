import { networkDiscoveryFeature } from '../features/network-discovery'
import type { FeatureDefinition } from '../shared/lib/feature'

/**
 * Registry of the tools shown in the navigation and on the dashboard.
 * To add a feature: create src/features/<name>, add a route in src/routes,
 * and append the feature definition here.
 */
export const features = [networkDiscoveryFeature] as const satisfies readonly FeatureDefinition[]
