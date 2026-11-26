import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { Scan, ScanEvent } from '@network-view/contracts'
import { networkDiscoveryApi } from '../api/network-discovery.api'
import { networkDiscoveryKeys } from '../api/queries'
import { applyScanEvent } from '../model/apply-scan-event'

/**
 * Subscribes to a running scan's event stream and folds the events into the
 * TanStack Query cache, so every component reading the scan query updates live.
 * Events are applied once per animation frame to keep large scans smooth.
 */
export function useScanEvents(scanId: string | undefined, isRunning: boolean) {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!scanId || !isRunning) return

    const key = networkDiscoveryKeys.scan(scanId)
    const source = new EventSource(networkDiscoveryApi.scanEventsUrl(scanId))
    let pending: ScanEvent[] = []
    let frame: number | null = null

    const flush = () => {
      frame = null
      const events = pending
      pending = []
      queryClient.setQueryData<Scan>(key, (scan) => events.reduce(applyScanEvent, scan))
    }

    source.onmessage = (message: MessageEvent<string>) => {
      const event = JSON.parse(message.data) as ScanEvent
      pending.push(event)
      frame ??= requestAnimationFrame(flush)

      const finished =
        event.type === 'status' || (event.type === 'snapshot' && event.scan.status !== 'running')
      if (finished) {
        // The server ends the stream now; close so EventSource does not reconnect.
        source.close()
        void queryClient.invalidateQueries({ queryKey: networkDiscoveryKeys.scans() })
      }
    }

    return () => {
      source.close()
      if (frame !== null) cancelAnimationFrame(frame)
      if (pending.length > 0) flush()
    }
  }, [scanId, isRunning, queryClient])
}
