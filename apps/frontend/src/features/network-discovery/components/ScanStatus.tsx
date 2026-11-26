import { useEffect, useState } from 'react'
import type { Scan, ScanPhase } from '@network-view/contracts'
import { Badge, Callout, ProgressBar, type BadgeTone } from '../../../shared/ui'
import { formatDuration } from '../../../shared/lib/format'
import styles from './ScanStatus.module.css'

const PHASE_LABELS: Record<ScanPhase, string> = {
  probing: 'Probing addresses',
  neighbors: 'Reading ARP cache',
  hostnames: 'Resolving hostnames',
  done: 'Done',
}

const STATUS_TONES: Record<Scan['status'], BadgeTone> = {
  running: 'accent',
  completed: 'neutral',
  cancelled: 'warning',
  failed: 'danger',
}

function useNow(active: boolean) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!active) return
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [active])
  return now
}

export function ScanStatus({ scan }: { scan: Scan }) {
  const running = scan.status === 'running'
  const now = useNow(running)
  const { phase, probed, total } = scan.progress

  return (
    <div className={styles.status}>
      <div className={styles.row}>
        <Badge tone={STATUS_TONES[scan.status]}>{scan.status}</Badge>
        <span className={styles.range}>
          <span className="mono">{scan.cidr}</span> on <span className="mono">{scan.interfaceName}</span>
        </span>
        <span className={styles.spacer} />
        <span className={styles.metric}>
          <strong>{scan.hostCount}</strong> hosts
        </span>
        <span className={styles.metric}>{formatDuration(scan.startedAt, scan.finishedAt, now)}</span>
      </div>

      {running && (
        <div className={styles.progress}>
          <ProgressBar value={probed} max={total} label={PHASE_LABELS[phase]} />
          <span className={styles.phase}>
            {PHASE_LABELS[phase]} · {probed}/{total}
          </span>
        </div>
      )}

      {scan.notice && <Callout>{scan.notice}</Callout>}
      {scan.error && <Callout tone="error">Scan failed: {scan.error}</Callout>}
    </div>
  )
}
