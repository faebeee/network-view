import { randomUUID } from 'node:crypto';
import { Observable, Subject, concat, defer, of } from 'rxjs';
import type {
  DiscoveredHost,
  DiscoverySource,
  Scan,
  ScanEvent,
  ScanProgress,
  ScanStatus,
} from '@network-view/contracts';
import { compareIps } from '../../../shared/net/ipv4.js';

export interface HostUpdate {
  ip: string;
  source?: DiscoverySource;
  mac?: string | null;
  vendor?: string | null;
  hostname?: string | null;
  latencyMs?: number | null;
  isSelf?: boolean;
  isGateway?: boolean;
  randomizedMac?: boolean;
}

export interface ScanTarget {
  interfaceName: string;
  cidr: string;
  total: number;
  notice: string | null;
}

/**
 * State of one discovery run. Every mutation is published as a {@link ScanEvent}
 * so clients can follow the scan live; new subscribers first receive a snapshot.
 */
export class ScanSession {
  readonly id = randomUUID();
  readonly abortController = new AbortController();
  private readonly startedAt = new Date().toISOString();
  private readonly hosts = new Map<string, DiscoveredHost>();
  private readonly events = new Subject<ScanEvent>();
  private status: ScanStatus = 'running';
  private finishedAt: string | null = null;
  private error: string | null = null;
  private progress: ScanProgress;

  constructor(readonly target: ScanTarget) {
    this.progress = { phase: 'probing', probed: 0, total: target.total };
  }

  get isRunning(): boolean {
    return this.status === 'running';
  }

  get signal(): AbortSignal {
    return this.abortController.signal;
  }

  hostIps(): string[] {
    return [...this.hosts.keys()];
  }

  getHost(ip: string): DiscoveredHost | undefined {
    return this.hosts.get(ip);
  }

  upsertHost(update: HostUpdate): void {
    const existing = this.hosts.get(update.ip);
    const host: DiscoveredHost = existing
      ? { ...existing }
      : {
          ip: update.ip,
          mac: null,
          vendor: null,
          hostname: null,
          latencyMs: null,
          sources: [],
          isSelf: false,
          isGateway: false,
          randomizedMac: false,
          firstSeenAt: new Date().toISOString(),
        };

    if (update.source && !host.sources.includes(update.source)) {
      host.sources = [...host.sources, update.source];
    }
    for (const key of ['mac', 'vendor', 'hostname', 'latencyMs'] as const) {
      const value = update[key];
      if (value !== undefined && value !== null) (host as Record<typeof key, unknown>)[key] = value;
    }
    for (const key of ['isSelf', 'isGateway', 'randomizedMac'] as const) {
      if (update[key] !== undefined) host[key] = update[key];
    }

    if (existing && JSON.stringify(existing) === JSON.stringify(host)) return;
    this.hosts.set(host.ip, host);
    this.emit({ type: 'host', host });
  }

  updateProgress(progress: Partial<ScanProgress>): void {
    this.progress = { ...this.progress, ...progress };
    this.emit({ type: 'progress', progress: this.progress });
  }

  finish(status: Exclude<ScanStatus, 'running'>, error: string | null = null): void {
    if (!this.isRunning) return;
    this.status = status;
    this.error = error;
    this.finishedAt = new Date().toISOString();
    this.updateProgress({ phase: 'done' });
    this.emit({ type: 'status', status, finishedAt: this.finishedAt, error });
    this.events.complete();
  }

  snapshot(): Scan {
    return {
      id: this.id,
      status: this.status,
      interfaceName: this.target.interfaceName,
      cidr: this.target.cidr,
      startedAt: this.startedAt,
      finishedAt: this.finishedAt,
      progress: this.progress,
      hostCount: this.hosts.size,
      error: this.error,
      notice: this.target.notice,
      hosts: [...this.hosts.values()].sort((a, b) => compareIps(a.ip, b.ip)),
    };
  }

  /** Snapshot followed by live events; completes when the scan has finished. */
  stream(): Observable<ScanEvent> {
    return defer(() =>
      concat(of<ScanEvent>({ type: 'snapshot', scan: this.snapshot() }), this.events),
    );
  }

  private emit(event: ScanEvent): void {
    if (!this.events.closed) this.events.next(event);
  }
}
