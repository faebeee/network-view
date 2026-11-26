import { Injectable, Logger } from '@nestjs/common';
import { createRequire } from 'node:module';
import { ouiPrefix } from '../../../shared/net/mac.js';

/** Resolves the manufacturer of a network adapter from the IEEE OUI registry. */
@Injectable()
export class MacVendorLookup {
  private readonly logger = new Logger(MacVendorLookup.name);
  private registry: Record<string, string> | null = null;

  lookup(mac: string): string | null {
    const entry = this.load()[ouiPrefix(mac)];
    // Entries contain the full postal address; the first line is the organisation name.
    return entry?.split('\n')[0]?.trim() || null;
  }

  private load(): Record<string, string> {
    if (!this.registry) {
      try {
        this.registry = createRequire(import.meta.url)('oui-data') as Record<string, string>;
      } catch (error) {
        this.logger.warn(`OUI registry unavailable: ${(error as Error).message}`);
        this.registry = {};
      }
    }
    return this.registry;
  }
}
