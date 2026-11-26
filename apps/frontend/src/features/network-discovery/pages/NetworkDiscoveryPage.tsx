import { useQuery } from '@tanstack/react-query'
import { Callout, Card } from '../../../shared/ui'
import { interfacesQueryOptions, scanQueryOptions, scansQueryOptions, useCancelScan, useStartScan } from '../api/queries'
import { HostTable } from '../components/HostTable'
import { RecentScans } from '../components/RecentScans'
import { ScanForm } from '../components/ScanForm'
import { ScanStatus } from '../components/ScanStatus'
import { useScanEvents } from '../hooks/useScanEvents'
import styles from './NetworkDiscoveryPage.module.css'

interface NetworkDiscoveryPageProps {
  /** Scan to display. Owned by the route (URL search param) so it survives reloads. */
  scanId: string | undefined
  onScanIdChange: (scanId: string) => void
}

export function NetworkDiscoveryPage({ scanId, onScanIdChange }: NetworkDiscoveryPageProps) {
  const interfaces = useQuery(interfacesQueryOptions())
  const scans = useQuery(scansQueryOptions())
  const scan = useQuery({ ...scanQueryOptions(scanId ?? ''), enabled: Boolean(scanId) })
  const startScan = useStartScan()
  const cancelScan = useCancelScan()

  const current = scanId ? scan.data : undefined
  const isRunning = current?.status === 'running'
  useScanEvents(scanId, isRunning)

  const error = interfaces.error ?? startScan.error ?? cancelScan.error ?? (scanId ? scan.error : null)

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1>Network Discovery</h1>
        <p>Find the hosts on your local network. Results stream in while the scan runs.</p>
      </header>

      {error && <Callout tone="error">{error.message}</Callout>}

      <Card>
        {interfaces.isPending ? (
          <p className={styles.muted}>Loading network interfaces…</p>
        ) : (
          <ScanForm
            interfaces={interfaces.data ?? []}
            isRunning={isRunning}
            isStarting={startScan.isPending}
            isCancelling={cancelScan.isPending}
            onStart={(request) => startScan.mutate(request, { onSuccess: (created) => onScanIdChange(created.id) })}
            onCancel={() => scanId && cancelScan.mutate(scanId)}
          />
        )}
      </Card>

      <div className={styles.layout}>
        <Card title="Hosts" className={styles.results}>
          {current ? (
            <div className={styles.stack}>
              <ScanStatus scan={current} />
              <HostTable hosts={current.hosts} isScanning={isRunning} />
            </div>
          ) : (
            <p className={styles.muted}>
              {scanId && scan.isPending ? 'Loading scan…' : 'Start a scan to see the hosts on your network.'}
            </p>
          )}
        </Card>

        <Card title="Recent scans" className={styles.history}>
          <RecentScans scans={scans.data ?? []} activeId={scanId} onSelect={onScanIdChange} />
        </Card>
      </div>
    </div>
  )
}
