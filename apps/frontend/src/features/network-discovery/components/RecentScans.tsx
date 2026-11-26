import type { ScanSummary } from '@network-view/contracts'
import { Badge } from '../../../shared/ui'
import { formatTime } from '../../../shared/lib/format'
import styles from './RecentScans.module.css'

interface RecentScansProps {
  scans: ScanSummary[]
  activeId: string | undefined
  onSelect: (id: string) => void
}

export function RecentScans({ scans, activeId, onSelect }: RecentScansProps) {
  if (scans.length === 0) return <p className={styles.empty}>No scans yet.</p>
  return (
    <ul className={styles.list}>
      {scans.map((scan) => (
        <li key={scan.id}>
          <button
            type="button"
            className={styles.item}
            aria-current={scan.id === activeId ? 'true' : undefined}
            onClick={() => onSelect(scan.id)}
          >
            <span className="mono">{scan.cidr}</span>
            <span className={styles.meta}>
              {formatTime(scan.startedAt)} · {scan.hostCount} hosts
            </span>
            {scan.status !== 'completed' && <Badge tone={scan.status === 'running' ? 'accent' : 'warning'}>{scan.status}</Badge>}
          </button>
        </li>
      ))}
    </ul>
  )
}
