import type { ComponentType, SVGProps } from 'react'

/**
 * Metadata a feature exposes to the app shell (navigation, dashboard).
 * Routing lives in src/routes; the route file imports the feature's page.
 */
export interface FeatureDefinition {
  id: string
  title: string
  description: string
  /** Route path of the feature's main page, e.g. `/network-discovery`. */
  path: string
  icon: ComponentType<SVGProps<SVGSVGElement>>
}
