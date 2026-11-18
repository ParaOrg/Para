// The emulator jobs' host list (scripts/apk/hosts-in-capture.mjs): read from a made-up capture of
// one DNS query, one TCP connection, one TLS ClientHello and one plain HTTP request, it names each
// host once under its kind and nothing else; a connection seen from both ends counts once; and a
// capture missing the control lookup, or the tile host while the app drew tiles, is untrusted.
//
//   node --test tests/unit/hosts-in-capture-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { hostLines, hostsInCapture, whyIncomplete } from '../../scripts/apk/hosts-in-capture.mjs';

const u16 = (n) => [(n >> 8) & 0xff, n & 0xff];

const PHONE = [10, 0, 2, 15];
const SERVER = [192, 0, 2, 7];

/** An Ethernet frame holding an IPv4 packet of `protocol` from the phone to the server, or back. */
const frame = (protocol, payload, isFromServer = false) => {
  const total = 20 + payload.length;
  const [from, to] = isFromServer ? [SERVER, PHONE] : [PHONE, SERVER];
  const ip = [0x45, 0, ...u16(total), 0, 0, 0, 0, 64, protocol, 0, 0, ...from, ...to];
  return Buffer.from([...Array(12).fill(0), 0x08, 0x00, ...ip, ...payload]);
};
const udp = (port, data) => [...u16(40000), ...u16(port), ...u16(8 + data.length), 0, 0, ...data];
const tcp = (port, flags, data = []) => [
  ...u16(40001),
  ...u16(port),
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0x50,
  flags,
  0xff,
  0xff,
  0,
  0,
  0,
  0,
  ...data,
];
const label = (name) => name.split('.').flatMap((part) => [part.length, ...Buffer.from(part)]);
const dnsQuery = (name) => [
  0,
  1,
  0x01,
  0,
  ...u16(1),
  0,
  0,
  0,
  0,
  0,
  0,
  ...label(name),
  0,
  0,
  1,
  0,
  1,
];
const clientHello = (name) => {
  const host = [...Buffer.from(name)];
  const sni = [
    0,
    0,
    ...u16(host.length + 5),
    ...u16(host.length + 3),
    0,
    ...u16(host.length),
    ...host,
  ];
  const body = [
    3,
    3,
    ...Array(32).fill(0),
    0,
    ...u16(2),
    0x13,
    0x01,
    1,
    0,
    ...u16(sni.length),
    ...sni,
  ];
  const handshake = [1, 0, ...u16(body.length), ...body];
  return [0x16, 3, 1, ...u16(handshake.length), ...handshake];
};

/** A classic little-endian pcap, Ethernet link type, of `frames`. */
const capture = (frames) => {
  const header = Buffer.alloc(24);
  header.writeUInt32LE(0xa1b2c3d4, 0);
  header.writeUInt16LE(2, 4);
  header.writeUInt16LE(4, 6);
  header.writeUInt32LE(65535, 16);
  header.writeUInt32LE(1, 20);
  const records = frames.map((f) => {
    const record = Buffer.alloc(16);
    record.writeUInt32LE(f.length, 8);
    record.writeUInt32LE(f.length, 12);
    return Buffer.concat([record, f]);
  });
  return Buffer.concat([header, ...records]);
};

test('each host is named once, under its kind', () => {
  const hosts = hostsInCapture(
    capture([
      frame(17, udp(53, dnsQuery('tiles.example.org'))),
      frame(6, tcp(443, 0x02)),
      frame(6, tcp(443, 0x18, clientHello('tiles.example.org'))),
      frame(
        6,
        tcp(80, 0x18, [...Buffer.from('GET / HTTP/1.1\r\nHost: plain.example.net\r\n\r\n')]),
      ),
    ]),
  );
  assert.deepEqual(hostLines(hosts, 'ride'), [
    'ride host: plain.example.net (dns 0, tls 0, http 1)',
    'ride host: tiles.example.org (dns 1, tls 1, http 0)',
    'ride connection: 192.0.2.7:443 ×1',
  ]);
});

test('an empty capture says so', () => {
  assert.deepEqual(hostLines(hostsInCapture(capture([])), 'ride'), [
    'ride: the capture holds no host',
  ]);
});

test('a file that is not a pcap is refused', () => {
  assert.throws(() => hostsInCapture(Buffer.alloc(24)), /not a pcap/);
});

/** The server's answer to the phone's port 40001, from `port`: a SYN-ACK by default. */
const tcpBack = (port, flags = 0x12) => [
  ...u16(port),
  ...u16(40001),
  ...Array(8).fill(0),
  0x50,
  flags,
  0xff,
  0xff,
  0,
  0,
  0,
  0,
];

test('a connection counts once, from either end', () => {
  const both = hostsInCapture(capture([frame(6, tcp(443, 0x02)), frame(6, tcpBack(443), true)]));
  assert.deepEqual(hostLines(both, 'ride'), ['ride connection: 192.0.2.7:443 ×1']);
  const answerOnly = hostsInCapture(capture([frame(6, tcpBack(443), true)]));
  assert.deepEqual(hostLines(answerOnly, 'ride'), ['ride connection: 192.0.2.7:443 ×1']);
});

test('a capture without the control lookup, or without the tile host the app drew from, is untrusted', () => {
  const hosts = hostsInCapture(
    capture([
      frame(17, udp(53, dnsQuery('capture-check.invalid'))),
      frame(17, udp(53, dnsQuery('tiles.example.org'))),
    ]),
  );
  const control = 'capture-check.invalid';
  assert.equal(
    whyIncomplete(hosts, { controlName: control, tiles: 12, tileHost: 'tiles.example.org' }),
    null,
  );
  assert.equal(
    whyIncomplete(hosts, { controlName: 'other-check.invalid' }),
    'the control lookup of other-check.invalid was not seen',
  );
  assert.equal(
    whyIncomplete(hosts, { controlName: control, tiles: 12, tileHost: 'tiles.example.net' }),
    'the app drew 12 tiles but no tile host was seen',
  );
  assert.equal(
    whyIncomplete(hosts, { controlName: control, tiles: 0, tileHost: 'tiles.example.net' }),
    null,
  );
});
