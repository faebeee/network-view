/** MAC address helpers shared by all network features. */

/**
 * Normalises a MAC address to lower-case, colon separated, zero padded form
 * (`0:1b:2:aa:3:4` and `00-1B-02-AA-03-04` both become `00:1b:02:aa:03:04`).
 * Returns null for malformed, empty, broadcast or multicast addresses.
 */
export function normalizeMac(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const parts = raw.trim().toLowerCase().split(/[:-]/);
  if (parts.length !== 6 || !parts.every((part) => /^[0-9a-f]{1,2}$/.test(part))) return null;
  const mac = parts.map((part) => part.padStart(2, '0')).join(':');
  if (mac === '00:00:00:00:00:00' || mac === 'ff:ff:ff:ff:ff:ff') return null;
  if (isMulticastMac(mac)) return null;
  return mac;
}

function firstOctet(mac: string): number {
  return parseInt(mac.slice(0, 2), 16);
}

export function isMulticastMac(mac: string): boolean {
  return (firstOctet(mac) & 0b01) === 0b01;
}

/** Locally administered addresses, e.g. randomised "private" Wi-Fi addresses on phones. */
export function isLocallyAdministeredMac(mac: string): boolean {
  return (firstOctet(mac) & 0b10) === 0b10;
}

/** First three octets as upper-case hex without separators, e.g. `001B02`. */
export function ouiPrefix(mac: string): string {
  return mac.replace(/:/g, '').slice(0, 6).toUpperCase();
}
