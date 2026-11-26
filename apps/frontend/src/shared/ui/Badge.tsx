import type { ReactNode } from 'react'
import styles from './Badge.module.css'

export type BadgeTone = 'neutral' | 'accent' | 'warning' | 'danger'

export function Badge({ tone = 'neutral', title, children }: { tone?: BadgeTone; title?: string; children: ReactNode }) {
  return (
    <span className={`${styles.badge} ${styles[tone]}`} title={title}>
      {children}
    </span>
  )
}
