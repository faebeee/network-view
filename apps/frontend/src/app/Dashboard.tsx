import { Link } from '@tanstack/react-router'
import { features } from './features'
import styles from './Dashboard.module.css'

export function Dashboard() {
  return (
    <div className={styles.page}>
      <header>
        <h1>Network tools</h1>
        <p>Pick a tool to analyse the network this machine is connected to.</p>
      </header>
      <div className={styles.grid}>
        {features.map((feature) => (
          <Link key={feature.id} to={feature.path} className={styles.tile}>
            <feature.icon width={24} height={24} className={styles.icon} aria-hidden />
            <h2>{feature.title}</h2>
            <p>{feature.description}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
