import { createFileRoute } from '@tanstack/react-router'
import { interfacesQueryOptions, NetworkDiscoveryPage, scansQueryOptions } from '../features/network-discovery'

interface NetworkDiscoverySearch {
  scan?: string
}

export const Route = createFileRoute('/network-discovery')({
  validateSearch: (search: Record<string, unknown>): NetworkDiscoverySearch => ({
    scan: typeof search.scan === 'string' && search.scan ? search.scan : undefined,
  }),
  loader: ({ context: { queryClient } }) => {
    void queryClient.prefetchQuery(interfacesQueryOptions())
    void queryClient.prefetchQuery(scansQueryOptions())
  },
  component: NetworkDiscoveryRoute,
})

function NetworkDiscoveryRoute() {
  const { scan } = Route.useSearch()
  const navigate = Route.useNavigate()
  return <NetworkDiscoveryPage scanId={scan} onScanIdChange={(id) => void navigate({ search: { scan: id } })} />
}
