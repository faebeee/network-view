import {
  formatCidr,
  hostAddresses,
  hostCount,
  intToIp,
  ipToInt,
  parseCidr,
  prefixLengthFromNetmask,
  rangeContains,
  rangeFor,
} from './ipv4.js';

describe('ipv4', () => {
  it('converts between dotted and integer form', () => {
    expect(ipToInt('192.168.1.10')).toBe(3232235786);
    expect(intToIp(3232235786)).toBe('192.168.1.10');
    expect(intToIp(ipToInt('255.255.255.255'))).toBe('255.255.255.255');
  });

  it('rejects invalid addresses', () => {
    expect(() => ipToInt('256.0.0.1')).toThrow();
    expect(() => ipToInt('10.0.0')).toThrow();
  });

  it('derives prefix lengths from netmasks', () => {
    expect(prefixLengthFromNetmask('255.255.255.0')).toBe(24);
    expect(prefixLengthFromNetmask('255.255.252.0')).toBe(22);
    expect(prefixLengthFromNetmask('255.255.255.255')).toBe(32);
    expect(prefixLengthFromNetmask('0.0.0.0')).toBe(0);
    expect(() => prefixLengthFromNetmask('255.0.255.0')).toThrow();
  });

  it('computes the network range of an address', () => {
    const range = rangeFor('192.168.1.77', 24);
    expect(formatCidr(range)).toBe('192.168.1.0/24');
    expect(intToIp(range.broadcast)).toBe('192.168.1.255');
    expect(hostCount(range)).toBe(254);
  });

  it('lists usable host addresses', () => {
    const hosts = hostAddresses(parseCidr('10.0.0.0/30'));
    expect(hosts).toEqual(['10.0.0.1', '10.0.0.2']);
    expect(hostAddresses(parseCidr('10.0.0.5/32'))).toEqual(['10.0.0.5']);
    expect(hostAddresses(parseCidr('172.16.0.0/22'))).toHaveLength(1022);
  });

  it('checks range membership', () => {
    const range = parseCidr('192.168.1.0/24');
    expect(rangeContains(range, '192.168.1.200')).toBe(true);
    expect(rangeContains(range, '192.168.2.1')).toBe(false);
    expect(rangeContains(range, 'nonsense')).toBe(false);
  });
});
