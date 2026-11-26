import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import type { Scan, StartScanRequest } from '@network-view/contracts'
import { networkDiscoveryApi } from './network-discovery.api'

export const networkDiscoveryKeys = {
  all: ['network-discovery'] as const,
  interfaces: () => [...networkDiscoveryKeys.all, 'interfaces'] as const,
  scans: () => [...networkDiscoveryKeys.all, 'scans'] as const,
  scan: (id: string) => [...networkDiscoveryKeys.all, 'scan', id] as const,
}

export const interfacesQueryOptions = () =>
  queryOptions({
    queryKey: networkDiscoveryKeys.interfaces(),
    queryFn: networkDiscoveryApi.listInterfaces,
    staleTime: 30_000,
  })

export const scansQueryOptions = () =>
  queryOptions({
    queryKey: networkDiscoveryKeys.scans(),
    queryFn: networkDiscoveryApi.listScans,
  })

/** Live updates arrive via server-sent events (see useScanEvents), so no polling is needed. */
export const scanQueryOptions = (id: string) =>
  queryOptions({
    queryKey: networkDiscoveryKeys.scan(id),
    queryFn: () => networkDiscoveryApi.getScan(id),
    staleTime: Infinity,
    retry: false,
  })

export function useStartScan() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (request: StartScanRequest) => networkDiscoveryApi.startScan(request),
    onSuccess: (scan) => {
      queryClient.setQueryData<Scan>(networkDiscoveryKeys.scan(scan.id), scan)
      void queryClient.invalidateQueries({ queryKey: networkDiscoveryKeys.scans() })
    },
  })
}

export function useCancelScan() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => networkDiscoveryApi.cancelScan(id),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: networkDiscoveryKeys.scans() }),
  })
}
