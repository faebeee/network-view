/** IPv4 helpers shared by all network features. Addresses are handled as unsigned 32-bit integers. */

export interface Ipv4Range {
  network: number;
  broadcast: number;
  prefixLength: number;
}

const IPV4_PATTERN = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;

export function isIpv4(value: string): boolean {
  const match = IPV4_PATTERN.exec(value);
  return match !== null && match.slice(1).every((octet) => Number(octet) <= 255);
}

export function ipToInt(ip: string): number {
  if (!isIpv4(ip)) throw new Error(`Invalid IPv4 address: ${ip}`);
  return ip.split('.').reduce((acc, octet) => acc * 256 + Number(octet), 0);
}

export function intToIp(value: number): string {
  return [24, 16, 8, 0].map((shift) => (value >>> shift) & 0xff).join('.');
}

export function prefixLengthFromNetmask(netmask: string): number {
  const mask = ipToInt(netmask);
  const bits = mask.toString(2).padStart(32, '0');
  if (!/^1*0*$/.test(bits)) throw new Error(`Non-contiguous netmask: ${netmask}`);
  return bits.indexOf('0') === -1 ? 32 : bits.indexOf('0');
}

function maskFor(prefixLength: number): number {
  return prefixLength === 0 ? 0 : (0xffffffff << (32 - prefixLength)) >>> 0;
}

export function rangeFor(ip: string, prefixLength: number): Ipv4Range {
  if (!Number.isInteger(prefixLength) || prefixLength < 0 || prefixLength > 32) {
    throw new Error(`Invalid prefix length: ${prefixLength}`);
  }
  const mask = maskFor(prefixLength);
  const network = (ipToInt(ip) & mask) >>> 0;
  const broadcast = (network | ~mask) >>> 0;
  return { network, broadcast, prefixLength };
}

export function parseCidr(cidr: string): Ipv4Range {
  const [ip, prefix] = cidr.split('/');
  if (ip === undefined || prefix === undefined || !/^\d+$/.test(prefix)) {
    throw new Error(`Invalid CIDR: ${cidr}`);
  }
  return rangeFor(ip, Number(prefix));
}

export function formatCidr(range: Ipv4Range): string {
  return `${intToIp(range.network)}/${range.prefixLength}`;
}

/** Usable host addresses (excludes network and broadcast address for prefixes up to /30). */
export function hostAddresses(range: Ipv4Range): string[] {
  const first = range.prefixLength >= 31 ? range.network : range.network + 1;
  const last = range.prefixLength >= 31 ? range.broadcast : range.broadcast - 1;
  const hosts: string[] = [];
  for (let value = first; value <= last; value++) hosts.push(intToIp(value));
  return hosts;
}

export function hostCount(range: Ipv4Range): number {
  const size = range.broadcast - range.network + 1;
  return range.prefixLength >= 31 ? size : size - 2;
}

export function rangeContains(range: Ipv4Range, ip: string): boolean {
  if (!isIpv4(ip)) return false;
  const value = ipToInt(ip);
  return value >= range.network && value <= range.broadcast;
}

export function compareIps(a: string, b: string): number {
  return ipToInt(a) - ipToInt(b);
}
