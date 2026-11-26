import { describe, expect, it } from 'vitest'
import type { DiscoveredHost, Scan } from '@network-view/contracts'
import { applyScanEvent } from './apply-scan-event'

const host = (ip: string, extra: Partial<DiscoveredHost> = {}): DiscoveredHost => ({
  ip,
  mac: null,
  vendor: null,
  hostname: null,
  latencyMs: null,
  sources: ['icmp'],
  isSelf: false,
  isGateway: false,
  randomizedMac: false,
  firstSeenAt: '2026-01-01T00:00:00.000Z',
  ...extra,
})

const scan: Scan = {
  id: 'scan-1',
  status: 'running',
  interfaceName: 'en0',
  cidr: '10.0.0.0/24',
  startedAt: '2026-01-01T00:00:00.000Z',
  finishedAt: null,
  progress: { phase: 'probing', probed: 0, total: 254 },
  hostCount: 1,
  error: null,
  notice: null,
  hosts: [host('10.0.0.20')],
}

describe('applyScanEvent', () => {
  it('inserts new hosts in numeric IP order', () => {
    const next = applyScanEvent(scan, { type: 'host', host: host('10.0.0.3') })
    expect(next?.hosts.map((h) => h.ip)).toEqual(['10.0.0.3', '10.0.0.20'])
    expect(next?.hostCount).toBe(2)
  })

  it('replaces existing hosts', () => {
    const next = applyScanEvent(scan, { type: 'host', host: host('10.0.0.20', { hostname: 'nas' }) })
    expect(next?.hosts).toHaveLength(1)
    expect(next?.hosts[0]?.hostname).toBe('nas')
  })

  it('applies progress, status and snapshot events', () => {
    const progressed = applyScanEvent(scan, { type: 'progress', progress: { phase: 'hostnames', probed: 1, total: 2 } })
    expect(progressed?.progress.phase).toBe('hostnames')

    const finished = applyScanEvent(scan, {
      type: 'status',
      status: 'completed',
      finishedAt: '2026-01-01T00:00:10.000Z',
      error: null,
    })
    expect(finished?.status).toBe('completed')

    const snapshot = { ...scan, hosts: [] }
    expect(applyScanEvent(undefined, { type: 'snapshot', scan: snapshot })).toBe(snapshot)
  })

  it('ignores incremental events without a cached scan', () => {
    expect(applyScanEvent(undefined, { type: 'host', host: host('10.0.0.1') })).toBeUndefined()
  })
})
