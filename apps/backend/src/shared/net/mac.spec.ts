import { isLocallyAdministeredMac, normalizeMac, ouiPrefix } from './mac.js';

describe('mac', () => {
  it('normalises separators, case and missing leading zeros', () => {
    expect(normalizeMac('0:1B:2:aa:3:4')).toBe('00:1b:02:aa:03:04');
    expect(normalizeMac('00-1B-02-AA-03-04')).toBe('00:1b:02:aa:03:04');
  });

  it('rejects invalid, broadcast and multicast addresses', () => {
    expect(normalizeMac('(incomplete)')).toBeNull();
    expect(normalizeMac('ff:ff:ff:ff:ff:ff')).toBeNull();
    expect(normalizeMac('00:00:00:00:00:00')).toBeNull();
    expect(normalizeMac('01:00:5e:00:00:fb')).toBeNull();
  });

  it('detects locally administered addresses', () => {
    expect(isLocallyAdministeredMac('da:a1:19:00:00:01')).toBe(true);
    expect(isLocallyAdministeredMac('00:1b:02:aa:03:04')).toBe(false);
  });

  it('extracts the OUI prefix', () => {
    expect(ouiPrefix('00:1b:02:aa:03:04')).toBe('001B02');
  });
});
