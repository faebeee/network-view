import { parseBsdRoute, parseIpRoute, parseWindowsRoute } from './gateway.resolver.js';
import { parsePingLatency, pingArgs } from './icmp.probe.js';
import { parseBsdArp, parseProcNetArp, parseWindowsArp } from './neighbor-table.js';
import { isScannableInterface } from './network-interfaces.provider.js';

describe('neighbour table parsers', () => {
  it('parses macOS arp -an output', () => {
    const output = [
      '? (192.168.1.1) at 0:11:22:33:44:55 on en0 ifscope [ethernet]',
      '? (192.168.1.20) at (incomplete) on en0 ifscope [ethernet]',
      '? (224.0.0.251) at 1:0:5e:0:0:fb on en0 ifscope permanent [ethernet]',
    ].join('\n');
    expect(parseBsdArp(output)).toEqual([
      { ip: '192.168.1.1', mac: '00:11:22:33:44:55', interfaceName: 'en0' },
    ]);
  });

  it('parses /proc/net/arp and skips incomplete entries', () => {
    const output = [
      'IP address       HW type     Flags       HW address            Mask     Device',
      '192.168.1.1      0x1         0x2         aa:bb:cc:dd:ee:ff     *        eth0',
      '192.168.1.9      0x1         0x0         00:00:00:00:00:00     *        eth0',
    ].join('\n');
    expect(parseProcNetArp(output)).toEqual([
      { ip: '192.168.1.1', mac: 'aa:bb:cc:dd:ee:ff', interfaceName: 'eth0' },
    ]);
  });

  it('parses Windows arp -a output', () => {
    const output = [
      'Interface: 192.168.1.23 --- 0x7',
      '  Internet Address      Physical Address      Type',
      '  192.168.1.1           aa-bb-cc-dd-ee-ff     dynamic',
      '  192.168.1.255         ff-ff-ff-ff-ff-ff     static',
    ].join('\n');
    expect(parseWindowsArp(output)).toEqual([
      { ip: '192.168.1.1', mac: 'aa:bb:cc:dd:ee:ff', interfaceName: null },
    ]);
  });
});

describe('gateway parsers', () => {
  it('parses macOS route output', () => {
    const output = '   route to: default\ndestination: default\n    gateway: 192.168.1.1\n  interface: en0\n';
    expect(parseBsdRoute(output)).toEqual({ ip: '192.168.1.1', interfaceName: 'en0' });
  });

  it('parses Linux ip route output', () => {
    expect(parseIpRoute('default via 10.0.0.1 dev wlan0 proto dhcp metric 600')).toEqual({
      ip: '10.0.0.1',
      interfaceName: 'wlan0',
    });
  });

  it('parses Windows route print output', () => {
    const output = '          0.0.0.0          0.0.0.0      192.168.1.1     192.168.1.23     25';
    expect(parseWindowsRoute(output)).toEqual({ ip: '192.168.1.1', interfaceName: null });
  });
});

describe('ping helpers', () => {
  it('builds platform specific arguments', () => {
    expect(pingArgs('darwin', '10.0.0.1', 800)).toEqual(['-c', '1', '-W', '800', '10.0.0.1']);
    expect(pingArgs('linux', '10.0.0.1', 800)).toEqual(['-c', '1', '-W', '1', '10.0.0.1']);
    expect(pingArgs('win32', '10.0.0.1', 800)).toEqual(['-n', '1', '-w', '800', '10.0.0.1']);
  });

  it('extracts the round trip time', () => {
    expect(parsePingLatency('64 bytes from 10.0.0.1: icmp_seq=0 ttl=64 time=3.412 ms')).toBe(3.412);
    expect(parsePingLatency('Reply from 10.0.0.1: bytes=32 time<1ms TTL=64')).toBe(1);
    expect(parsePingLatency('Request timeout')).toBeNull();
  });
});

describe('isScannableInterface', () => {
  it('keeps physical interfaces', () => {
    expect(isScannableInterface('en0', '192.168.1.10')).toBe(true);
    expect(isScannableInterface('eth0', '10.0.0.2')).toBe(true);
    expect(isScannableInterface('wlp3s0', '10.0.0.3')).toBe(true);
  });

  it('skips container bridges, tunnels and link-local addresses', () => {
    expect(isScannableInterface('podman7', '10.89.40.1')).toBe(false);
    expect(isScannableInterface('docker0', '172.17.0.1')).toBe(false);
    expect(isScannableInterface('br-1a2b3c', '172.18.0.1')).toBe(false);
    expect(isScannableInterface('veth12ab', '10.88.0.5')).toBe(false);
    expect(isScannableInterface('en0', '169.254.10.20')).toBe(false);
  });
});
