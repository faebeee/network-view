import { Body, Controller, Delete, Get, HttpCode, Param, Post, Sse } from '@nestjs/common';
import type { MessageEvent } from '@nestjs/common';
import { map, type Observable } from 'rxjs';
import {
  startScanRequestSchema,
  type NetworkInterfaceInfo,
  type Scan,
  type ScanSummary,
  type StartScanOptions,
} from '@network-view/contracts';
import { NetworkDiscoveryService } from './network-discovery.service.js';

@Controller('network-discovery')
export class NetworkDiscoveryController {
  constructor(private readonly discovery: NetworkDiscoveryService) {}

  @Get('interfaces')
  listInterfaces(): Promise<NetworkInterfaceInfo[]> {
    return this.discovery.listInterfaces();
  }

  @Get('scans')
  listScans(): ScanSummary[] {
    return this.discovery.listScans();
  }

  @Post('scans')
  async startScan(
    @Body({ schema: startScanRequestSchema }) options: StartScanOptions,
  ): Promise<Scan> {
    return (await this.discovery.startScan(options)).snapshot();
  }

  @Get('scans/:id')
  getScan(@Param('id') id: string): Scan {
    return this.discovery.getScan(id).snapshot();
  }

  @Delete('scans/:id')
  @HttpCode(200)
  cancelScan(@Param('id') id: string): Scan {
    return this.discovery.cancelScan(id).snapshot();
  }

  /** Server-sent events: a snapshot first, then incremental updates until the scan ends. */
  @Sse('scans/:id/events')
  streamScan(@Param('id') id: string): Observable<MessageEvent> {
    return this.discovery
      .getScan(id)
      .stream()
      .pipe(map((event) => ({ data: event })));
  }
}
