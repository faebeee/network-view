import { useMemo, useState } from 'react'
import {
  createColumnHelper,
  createSortedRowModel,
  flexRender,
  rowSortingFeature,
  sortFn_alphanumeric,
  sortFn_basic,
  tableFeatures,
  useTable,
} from '@tanstack/react-table'
import type { DiscoveredHost, DiscoverySource } from '@network-view/contracts'
import { Badge } from '../../../shared/ui'
import { formatLatency } from '../../../shared/lib/format'
import { compareIps } from '../model/ip'
import styles from './HostTable.module.css'

const SOURCE_LABELS: Record<DiscoverySource, { label: string; title: string }> = {
  self: { label: 'local', title: 'This machine' },
  icmp: { label: 'ping', title: 'Answered an ICMP echo request' },
  tcp: { label: 'tcp', title: 'Accepted or refused a TCP connection' },
  arp: { label: 'arp', title: 'Present in the ARP / neighbour cache' },
}

const features = tableFeatures({
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
  sortFns: { alphanumeric: sortFn_alphanumeric, basic: sortFn_basic },
})

const column = createColumnHelper<typeof features, DiscoveredHost>()

const columns = column.columns([
  column.accessor('ip', {
    header: 'IP address',
    sortFn: (a, b) => compareIps(a.original.ip, b.original.ip),
    cell: ({ row }) => (
      <div className={styles.ipCell}>
        <span className="mono">{row.original.ip}</span>
        {row.original.isGateway && <Badge tone="accent">Gateway</Badge>}
        {row.original.isSelf && <Badge tone="accent">This device</Badge>}
      </div>
    ),
  }),
  column.accessor((host) => host.hostname ?? undefined, {
    id: 'hostname',
    header: 'Hostname',
    sortFn: 'alphanumeric',
    sortUndefined: 'last',
    cell: ({ getValue }) => getValue() ?? <span className={styles.muted}>–</span>,
  }),
  column.accessor((host) => host.vendor ?? undefined, {
    id: 'vendor',
    header: 'Vendor',
    sortFn: 'alphanumeric',
    sortUndefined: 'last',
    cell: ({ getValue, row }) =>
      getValue() ?? <span className={styles.muted}>{row.original.randomizedMac ? 'Private address' : '–'}</span>,
  }),
  column.accessor((host) => host.mac ?? undefined, {
    id: 'mac',
    header: 'MAC address',
    sortFn: 'basic',
    sortUndefined: 'last',
    cell: ({ row }) =>
      row.original.mac ? (
        <div className={styles.ipCell}>
          <span className="mono">{row.original.mac}</span>
          {row.original.randomizedMac && (
            <Badge tone="warning" title="Locally administered (randomised) MAC address">
              Private
            </Badge>
          )}
        </div>
      ) : (
        <span className={styles.muted}>–</span>
      ),
  }),
  column.accessor((host) => host.latencyMs ?? undefined, {
    id: 'latency',
    header: 'Latency',
    sortFn: 'basic',
    sortUndefined: 'last',
    cell: ({ row }) => <span className={styles.numeric}>{formatLatency(row.original.latencyMs)}</span>,
  }),
  column.display({
    id: 'sources',
    header: 'Detected via',
    cell: ({ row }) => (
      <div className={styles.sources}>
        {row.original.sources.map((source) => (
          <Badge key={source} title={SOURCE_LABELS[source].title}>
            {SOURCE_LABELS[source].label}
          </Badge>
        ))}
      </div>
    ),
  }),
])

function matches(host: DiscoveredHost, query: string): boolean {
  return [host.ip, host.hostname, host.vendor, host.mac].some((value) => value?.toLowerCase().includes(query))
}

export function HostTable({ hosts, isScanning }: { hosts: DiscoveredHost[]; isScanning: boolean }) {
  const [query, setQuery] = useState('')
  const normalized = query.trim().toLowerCase()
  const data = useMemo(
    () => (normalized ? hosts.filter((host) => matches(host, normalized)) : hosts),
    [hosts, normalized],
  )

  const table = useTable({
    features,
    data,
    columns,
    getRowId: (host) => host.ip,
    initialState: { sorting: [{ id: 'ip', desc: false }] },
  })

  return (
    <div className={styles.wrapper}>
      <div className={styles.toolbar}>
        <input
          type="search"
          className={styles.search}
          placeholder="Filter by IP, hostname, vendor or MAC"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          aria-label="Filter hosts"
        />
        <span className={styles.count}>
          {data.length === hosts.length ? `${hosts.length} hosts` : `${data.length} of ${hosts.length} hosts`}
        </span>
      </div>

      <div className={styles.scroll}>
        <table className={styles.table}>
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const sorted = header.column.getIsSorted()
                  const canSort = header.column.getCanSort()
                  return (
                    <th key={header.id} aria-sort={sorted ? (sorted === 'asc' ? 'ascending' : 'descending') : undefined}>
                      {canSort ? (
                        <button type="button" className={styles.sortButton} onClick={header.column.getToggleSortingHandler()}>
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          <span className={styles.sortIcon} aria-hidden>
                            {sorted === 'asc' ? '▲' : sorted === 'desc' ? '▼' : ''}
                          </span>
                        </button>
                      ) : (
                        flexRender(header.column.columnDef.header, header.getContext())
                      )}
                    </th>
                  )
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id}>
                {row.getAllCells().map((cell) => (
                  <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>

        {data.length === 0 && (
          <p className={styles.empty}>
            {hosts.length > 0 ? 'No hosts match the filter.' : isScanning ? 'Looking for hosts…' : 'No hosts found.'}
          </p>
        )}
      </div>
    </div>
  )
}
