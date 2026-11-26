import type { NetworkInterfaceInfo, Scan, ScanSummary, StartScanRequest } from '@network-view/contracts'
import { apiRequest, apiUrl } from '../../../shared/api/http'

const BASE = '/network-discovery'

export const networkDiscoveryApi = {
  listInterfaces: () => apiRequest<NetworkInterfaceInfo[]>(`${BASE}/interfaces`),
  listScans: () => apiRequest<ScanSummary[]>(`${BASE}/scans`),
  getScan: (id: string) => apiRequest<Scan>(`${BASE}/scans/${encodeURIComponent(id)}`),
  startScan: (request: StartScanRequest) =>
    apiRequest<Scan>(`${BASE}/scans`, { method: 'POST', body: JSON.stringify(request) }),
  cancelScan: (id: string) => apiRequest<Scan>(`${BASE}/scans/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  scanEventsUrl: (id: string) => apiUrl(`${BASE}/scans/${encodeURIComponent(id)}/events`),
}
