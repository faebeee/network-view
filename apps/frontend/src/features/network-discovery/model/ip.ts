export function ipToNumber(ip: string): number {
  return ip.split('.').reduce((acc, octet) => acc * 256 + Number(octet), 0)
}

export function compareIps(a: string, b: string): number {
  return ipToNumber(a) - ipToNumber(b)
}
