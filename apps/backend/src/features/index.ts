import { NetworkDiscoveryModule } from './network-discovery/network-discovery.module.js';

/**
 * Every feature is a self-contained Nest module under `src/features/<name>`.
 * Register new features here; `AppModule` imports this list.
 */
export const FEATURE_MODULES = [NetworkDiscoveryModule];
