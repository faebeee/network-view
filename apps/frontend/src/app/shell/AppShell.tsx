import { Link, Outlet } from '@tanstack/react-router'
import { features } from '../features'
import styles from './AppShell.module.css'

export function AppShell() {
  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <Link to="/" className={styles.brand}>
          <img src="/favicon.svg" alt="" width={26} height={26} />
          Network View
        </Link>
        <nav aria-label="Tools">
          <p className={styles.navHeading}>Tools</p>
          <ul className={styles.nav}>
            {features.map((feature) => (
              <li key={feature.id}>
                <Link to={feature.path} className={styles.navLink} activeProps={{ className: styles.active }}>
                  <feature.icon width={18} height={18} aria-hidden />
                  {feature.title}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </aside>
      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  )
}
