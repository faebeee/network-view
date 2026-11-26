import { z } from 'zod';

const CIDR_PATTERN =
  /^(25[0-5]|2[0-4]\d|1?\d?\d)(\.(25[0-5]|2[0-4]\d|1?\d?\d)){3}\/([0-9]|[12]\d|3[0-2])$/;

/** Smallest prefix (largest range) a single scan may cover: /20 = 4094 hosts. */
export const MIN_SCAN_PREFIX_LENGTH = 20;

export const startScanRequestSchema = z.object({
  /** Interface to scan from. Defaults to the interface holding the default route. */
  interfaceName: z.string().min(1).optional(),
  /** Explicit IPv4 range, e.g. 192.168.1.0/24. Defaults to the interface subnet. */
  cidr: z.string().regex(CIDR_PATTERN, 'Expected an IPv4 CIDR such as 192.168.1.0/24').optional(),
  /** Probe common TCP ports for hosts that do not answer ping. */
  tcpProbe: z.boolean().default(true),
  /** Resolve hostnames via reverse DNS / mDNS. */
  resolveHostnames: z.boolean().default(true),
});

export type StartScanRequest = z.input<typeof startScanRequestSchema>;
export type StartScanOptions = z.output<typeof startScanRequestSchema>;

export interface NetworkInterfaceInfo {
  name: string;
  address: string;
  netmask: string;
  prefixLength: number;
  /** Network range of the interface, e.g. 192.168.1.0/24. */
  cidr: string;
  mac: string | null;
  isDefault: boolean;
}

/** How a host was detected. A host can be detected by several methods. */
export type DiscoverySource = 'self' | 'icmp' | 'tcp' | 'arp';

export interface DiscoveredHost {
  ip: string;
  mac: string | null;
  vendor: string | null;
  hostname: string | null;
  latencyMs: number | null;
  sources: DiscoverySource[];
  isSelf: boolean;
  isGateway: boolean;
  /** Locally administered MAC address, typical for phones using private Wi-Fi addresses. */
  randomizedMac: boolean;
  firstSeenAt: string;
}

export type ScanStatus = 'running' | 'completed' | 'cancelled' | 'failed';
export type ScanPhase = 'probing' | 'neighbors' | 'hostnames' | 'done';

export interface ScanProgress {
  phase: ScanPhase;
  probed: number;
  total: number;
}

export interface ScanSummary {
  id: string;
  status: ScanStatus;
  interfaceName: string;
  cidr: string;
  startedAt: string;
  finishedAt: string | null;
  progress: ScanProgress;
  hostCount: number;
  error: string | null;
  /** Informational message, e.g. when the scanned range was narrowed. */
  notice: string | null;
}

export interface Scan extends ScanSummary {
  hosts: DiscoveredHost[];
}

/** Events sent over the server-sent event stream of a scan. */
export type ScanEvent =
  | { type: 'snapshot'; scan: Scan }
  | { type: 'host'; host: DiscoveredHost }
  | { type: 'progress'; progress: ScanProgress }
  | { type: 'status'; status: ScanStatus; finishedAt: string | null; error: string | null };
