import { Injectable } from '@nestjs/common';
import { Socket } from 'node:net';

/** Ports that are open on most device classes (web UIs, SSH, SMB, RDP, Apple devices, printers). */
export const DEFAULT_TCP_PROBE_PORTS = [80, 443, 22, 445, 139, 3389, 62078, 8080, 9100];

/**
 * Detects hosts that drop ICMP. Both an accepted connection and an active
 * refusal (RST) prove that a host is present at that address.
 */
@Injectable()
export class TcpProbe {
  async probe(
    ip: string,
    ports: readonly number[] = DEFAULT_TCP_PROBE_PORTS,
    timeoutMs = 700,
  ): Promise<{ alive: boolean; latencyMs: number | null }> {
    const results = await Promise.all(ports.map((port) => this.connect(ip, port, timeoutMs)));
    const latencies = results.filter((latency): latency is number => latency !== null);
    return latencies.length > 0
      ? { alive: true, latencyMs: Math.min(...latencies) }
      : { alive: false, latencyMs: null };
  }

  private connect(ip: string, port: number, timeoutMs: number): Promise<number | null> {
    return new Promise((resolve) => {
      const started = performance.now();
      const socket = new Socket();
      const finish = (alive: boolean) => {
        socket.destroy();
        resolve(alive ? Math.round((performance.now() - started) * 10) / 10 : null);
      };
      socket.setTimeout(timeoutMs);
      socket.once('connect', () => finish(true));
      socket.once('timeout', () => finish(false));
      socket.once('error', (error: NodeJS.ErrnoException) => finish(error.code === 'ECONNREFUSED'));
      socket.connect(port, ip);
    });
  }
}
