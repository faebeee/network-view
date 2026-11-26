import type { DiscoveredHost, Scan, ScanEvent } from '@network-view/contracts'
import { compareIps } from './ip'

function upsertHost(hosts: DiscoveredHost[], host: DiscoveredHost): DiscoveredHost[] {
  const index = hosts.findIndex((existing) => existing.ip === host.ip)
  if (index >= 0) return hosts.with(index, host)
  return [...hosts, host].sort((a, b) => compareIps(a.ip, b.ip))
}

/** Folds a server-sent scan event into the cached scan. */
export function applyScanEvent(scan: Scan | undefined, event: ScanEvent): Scan | undefined {
  if (event.type === 'snapshot') return event.scan
  if (!scan) return scan
  switch (event.type) {
    case 'host': {
      const hosts = upsertHost(scan.hosts, event.host)
      return { ...scan, hosts, hostCount: hosts.length }
    }
    case 'progress':
      return { ...scan, progress: event.progress }
    case 'status':
      return { ...scan, status: event.status, finishedAt: event.finishedAt, error: event.error }
  }
}
