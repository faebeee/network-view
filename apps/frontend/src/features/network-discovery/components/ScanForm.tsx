import { useState, type FormEvent } from 'react'
import type { NetworkInterfaceInfo, StartScanRequest } from '@network-view/contracts'
import { Button } from '../../../shared/ui'
import styles from './ScanForm.module.css'

interface ScanFormProps {
  interfaces: NetworkInterfaceInfo[]
  isRunning: boolean
  isStarting: boolean
  isCancelling: boolean
  onStart: (request: StartScanRequest) => void
  onCancel: () => void
}

export function ScanForm({ interfaces, isRunning, isStarting, isCancelling, onStart, onCancel }: ScanFormProps) {
  const defaultInterface = interfaces.find((iface) => iface.isDefault) ?? interfaces[0]
  const [interfaceName, setInterfaceName] = useState(defaultInterface?.name ?? '')
  const [cidr, setCidr] = useState('')
  const [tcpProbe, setTcpProbe] = useState(true)
  const [resolveHostnames, setResolveHostnames] = useState(true)

  const selected = interfaces.find((iface) => iface.name === interfaceName) ?? defaultInterface

  const submit = (event: FormEvent) => {
    event.preventDefault()
    onStart({
      interfaceName: selected?.name,
      cidr: cidr.trim() || undefined,
      tcpProbe,
      resolveHostnames,
    })
  }

  return (
    <form className={styles.form} onSubmit={submit}>
      <label className={styles.field}>
        <span className={styles.label}>Interface</span>
        <select
          value={selected?.name ?? ''}
          onChange={(event) => setInterfaceName(event.target.value)}
          disabled={isRunning || interfaces.length === 0}
        >
          {interfaces.map((iface) => (
            <option key={`${iface.name}-${iface.address}`} value={iface.name}>
              {iface.name} · {iface.address}
              {iface.isDefault ? ' (default)' : ''}
            </option>
          ))}
        </select>
      </label>

      <label className={styles.field}>
        <span className={styles.label}>Range</span>
        <input
          className="mono"
          value={cidr}
          onChange={(event) => setCidr(event.target.value)}
          placeholder={selected?.cidr ?? '192.168.1.0/24'}
          disabled={isRunning}
          spellCheck={false}
          autoComplete="off"
        />
      </label>

      <fieldset className={styles.options} disabled={isRunning}>
        <label className={styles.checkbox}>
          <input type="checkbox" checked={tcpProbe} onChange={(event) => setTcpProbe(event.target.checked)} />
          TCP probe hosts that ignore ping
        </label>
        <label className={styles.checkbox}>
          <input
            type="checkbox"
            checked={resolveHostnames}
            onChange={(event) => setResolveHostnames(event.target.checked)}
          />
          Resolve hostnames
        </label>
      </fieldset>

      <div className={styles.submit}>
        {isRunning ? (
          <Button variant="danger" onClick={onCancel} disabled={isCancelling}>
            {isCancelling ? 'Stopping…' : 'Stop scan'}
          </Button>
        ) : (
          <Button type="submit" disabled={isStarting || interfaces.length === 0}>
            {isStarting ? 'Starting…' : 'Scan network'}
          </Button>
        )}
      </div>
    </form>
  )
}
