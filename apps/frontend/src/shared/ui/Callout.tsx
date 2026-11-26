import type { ReactNode } from 'react'
import styles from './Callout.module.css'

export function Callout({ tone = 'info', children }: { tone?: 'info' | 'error'; children: ReactNode }) {
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className={`${styles.callout} ${styles[tone]}`}>
      {children}
    </div>
  )
}
