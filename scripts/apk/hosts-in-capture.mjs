// The hosts an emulator job reached, from the emulator's own packet capture (`-tcpdump`,
// contributor-app.yml): the names it looked up (DNS queries), the names it opened TLS to (the
// ClientHello's server name), the hosts it asked over plain HTTP (the Host header), and every TCP
// connection it opened, by address and port, seen from either end (the phone's SYN or the server's
// SYN-ACK). Only these are printed, with their counts; nothing else in the capture is read or kept
// (.scratch/e2e-stand-ins/issues/03).
//
//   node scripts/apk/hosts-in-capture.mjs <capture.pcap> <label> [--control <name>]
//     [--tiles <count> --tile-host <host>]
//
// Two checks decide whether the capture can be trusted, and an untrusted one prints no list, only
// why: the control name (a lookup the job makes on purpose) must be among the names looked up, and
// when the app drew `count` tiles, the tile host must be among the names.
//
// The capture is the whole emulator's, Android's own traffic with the app's: a host here was
// reached by the phone, not necessarily by the app.
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

/** The capture's link types this reads: Ethernet, raw IP, Linux cooked, IPv4, IPv6. */
const LINK = { ethernet: 1, raw: 101, rawOld: 12, cooked: 113, ipv4: 228, ipv6: 229 };

/**
 * The hosts in a classic pcap capture, as counts by kind. Throws on a file that is not one.
 * @param {Buffer} capture
 * @returns {{ names: Map<string, { dns: number, tls: number, http: number }>, connections: Map<string, number>, firstSecond: number | null, lastSecond: number | null }}
 *   `connections` counts each server address and port by the phone's ports that opened it;
 *   `firstSecond` and `lastSecond` are its first and last packets' times, in Unix seconds.
 */
export function hostsInCapture(capture) {
  if (capture.length < 24) throw new Error('not a pcap capture: shorter than its header');
  const magic = capture.readUInt32LE(0);
  const isLittle = magic === 0xa1b2c3d4 || magic === 0xa1b23c4d;
  const isBig = magic === 0xd4c3b2a1 || magic === 0x4d3cb2a1;
  if (!isLittle && !isBig) throw new Error('not a pcap capture (pcapng is not read)');
  const u32 = (at) => (isLittle ? capture.readUInt32LE(at) : capture.readUInt32BE(at));
  const linkType = u32(20) & 0xffff;

  const names = new Map();
  const connections = new Map();
  const count = (name, kind) => {
    const key = name.toLowerCase();
    const counts = names.get(key) ?? { dns: 0, tls: 0, http: 0 };
    counts[kind] += 1;
    names.set(key, counts);
  };

  /** By server address and port, the phone's ports that connected to it. */
  const opened = new Map();
  let firstSecond = null;
  let lastSecond = null;
  for (let at = 24; at + 16 <= capture.length;) {
    const second = u32(at);
    firstSecond ??= second;
    lastSecond = second;
    const length = u32(at + 8);
    const packet = capture.subarray(at + 16, at + 16 + length);
    at += 16 + length;
    const ip = ipOf(packet, linkType);
    if (!ip) continue;
    if (ip.protocol === 17) readUdp(ip, count);
    if (ip.protocol === 6) readTcp(ip, count, opened);
  }
  for (const [server, ports] of opened) connections.set(server, ports.size);
  return { names, connections, firstSecond, lastSecond };
}

/** The IP packet inside a frame of `linkType`: its protocol, addresses and payload. */
function ipOf(frame, linkType) {
  let at = 0;
  if (linkType === LINK.ethernet) {
    at = 14;
    let etherType = frame.length >= 14 ? frame.readUInt16BE(12) : 0;
    if (etherType === 0x8100 && frame.length >= 18) {
      etherType = frame.readUInt16BE(16);
      at = 18;
    }
    if (etherType !== 0x0800 && etherType !== 0x86dd) return null;
  } else if (linkType === LINK.cooked) {
    at = 16;
  } else if (![LINK.raw, LINK.rawOld, LINK.ipv4, LINK.ipv6].includes(linkType)) {
    return null;
  }
  const ip = frame.subarray(at);
  if (ip.length < 20) return null;
  const version = ip[0] >> 4;
  if (version === 4) {
    const headerLength = (ip[0] & 0x0f) * 4;
    return {
      protocol: ip[9],
      source: [...ip.subarray(12, 16)].join('.'),
      destination: [...ip.subarray(16, 20)].join('.'),
      payload: ip.subarray(headerLength, ip.readUInt16BE(2)),
    };
  }
  if (version === 6 && ip.length >= 40) {
    const address = (from) => {
      const groups = [];
      for (let i = from; i < from + 16; i += 2) groups.push(ip.readUInt16BE(i).toString(16));
      return `[${groups.join(':')}]`;
    };
    return {
      protocol: ip[6],
      source: address(8),
      destination: address(24),
      payload: ip.subarray(40),
    };
  }
  return null;
}

/** A DNS query's name (to port 53). */
function readUdp({ payload }, count) {
  if (payload.length < 8 || payload.readUInt16BE(2) !== 53) return;
  const dns = payload.subarray(8);
  const isQuery = dns.length >= 12 && (dns[2] & 0x80) === 0 && dns.readUInt16BE(4) > 0;
  if (!isQuery) return;
  const labels = [];
  for (let at = 12; at < dns.length && dns[at] !== 0; at += dns[at] + 1) {
    if (dns[at] >= 0xc0) return;
    labels.push(dns.subarray(at + 1, at + 1 + dns[at]).toString('latin1'));
  }
  if (labels.length) count(labels.join('.'), 'dns');
}

/** A new connection (SYN or SYN-ACK), a TLS ClientHello's server name, or an HTTP request's Host. */
function readTcp({ source, destination, payload }, count, opened) {
  if (payload.length < 20) return;
  const sourcePort = payload.readUInt16BE(0);
  const port = payload.readUInt16BE(2);
  const flags = payload[13];
  if (flags & 0x02) {
    // The SYN names the server as its destination; the SYN-ACK, as its source.
    const isSynAck = Boolean(flags & 0x10);
    const server = isSynAck ? `${source}:${sourcePort}` : `${destination}:${port}`;
    const phonePort = isSynAck ? port : sourcePort;
    const ports = opened.get(server) ?? new Set();
    ports.add(phonePort);
    opened.set(server, ports);
  }
  const data = payload.subarray((payload[12] >> 4) * 4);
  const serverName = serverNameOf(data);
  if (serverName) count(serverName, 'tls');
  const host =
    /^(?:GET|POST|PUT|HEAD|DELETE|OPTIONS|PATCH) [^\r\n]* HTTP\/1\.[01]\r\n(?:[^\r\n]*\r\n)*?Host: ([^\r\n:]+)/i.exec(
      data.subarray(0, 2048).toString('latin1'),
    );
  if (host) count(host[1], 'http');
}

/** The server name in a TLS ClientHello that starts this segment, if it does. */
function serverNameOf(data) {
  if (data.length < 44 || data[0] !== 0x16 || data[5] !== 0x01) return null;
  let at = 9 + 2 + 32; // handshake header, version, random
  const skip = (lengthBytes) => {
    if (at + lengthBytes > data.length) return false;
    at += lengthBytes + data.readUIntBE(at, lengthBytes);
    return at <= data.length;
  };
  if (!skip(1) || !skip(2) || !skip(1)) return null; // session id, cipher suites, compression
  if (at + 2 > data.length) return null;
  const end = Math.min(data.length, at + 2 + data.readUInt16BE(at));
  for (at += 2; at + 4 <= end;) {
    const type = data.readUInt16BE(at);
    const length = data.readUInt16BE(at + 2);
    if (type === 0 && at + 9 <= end) {
      const nameLength = data.readUInt16BE(at + 7);
      return data.subarray(at + 9, at + 9 + nameLength).toString('latin1');
    }
    at += 4 + length;
  }
  return null;
}

/** The lines the job prints: one per name, then one per connection, each with its counts. */
export function hostLines({ names, connections }, label) {
  const lines = [...names]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, c]) => `${label} host: ${name} (dns ${c.dns}, tls ${c.tls}, http ${c.http})`);
  const opened = [...connections]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([to, n]) => `${label} connection: ${to} ×${n}`);
  if (!lines.length && !opened.length) return [`${label}: the capture holds no host`];
  return [...lines, ...opened];
}

/**
 * Why the capture can't be trusted, or null when it can: the control lookup is missing, or the app
 * drew tiles and the tile host is nowhere among the names.
 */
export function whyIncomplete({ names }, { controlName, tiles = 0, tileHost }) {
  if (controlName && !names.has(controlName.toLowerCase())) {
    return `the control lookup of ${controlName} was not seen`;
  }
  if (tiles > 0 && tileHost && !names.has(tileHost.toLowerCase())) {
    return `the app drew ${tiles} tiles but no tile host was seen`;
  }
  return null;
}

/** When the capture's packets begin and end, in UTC, or nothing for an empty one. */
export function spanOf({ firstSecond, lastSecond }) {
  if (firstSecond === null || lastSecond === null) return '';
  const time = (second) => new Date(second * 1000).toISOString().slice(11, 19);
  return `, packets from ${time(firstSecond)} to ${time(lastSecond)} UTC`;
}

/** The value after `--name` among the arguments, if there is one. */
const option = (args, name) => {
  const at = args.indexOf(`--${name}`);
  return at >= 0 ? args[at + 1] : undefined;
};

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  const [file, label] = args;
  if (!file || !label) throw new Error('usage: hosts-in-capture.mjs <capture.pcap> <label> [...]');
  const hosts = hostsInCapture(readFileSync(file));
  const why = whyIncomplete(hosts, {
    controlName: option(args, 'control'),
    tiles: Number(option(args, 'tiles') ?? 0),
    tileHost: option(args, 'tile-host'),
  });
  // An untrusted capture names nothing, but says how much it held and over what span, to tell an
  // empty capture from one that stopped early.
  const held = `(it held ${hosts.names.size} names and ${hosts.connections.size} connections${spanOf(hosts)})`;
  const lines = why ? [`${label}: capture incomplete: ${why} ${held}`] : hostLines(hosts, label);
  for (const line of lines) console.log(line);
}
