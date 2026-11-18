// The hosts an emulator job reached, from the emulator's own packet capture (`-tcpdump`,
// contributor-app.yml): the names it looked up (DNS queries), the names it opened TLS to (the
// ClientHello's server name), the hosts it asked over plain HTTP (the Host header), and every TCP
// connection it opened, by address and port. Only these are printed, with their counts; nothing
// else in the capture is read or kept (.scratch/e2e-stand-ins/issues/03).
//
//   node scripts/apk/hosts-in-capture.mjs <capture.pcap> [label]
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
 * @returns {{ names: Map<string, { dns: number, tls: number, http: number }>, connections: Map<string, number> }}
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

  for (let at = 24; at + 16 <= capture.length;) {
    const length = u32(at + 8);
    const packet = capture.subarray(at + 16, at + 16 + length);
    at += 16 + length;
    const ip = ipOf(packet, linkType);
    if (!ip) continue;
    if (ip.protocol === 17) readUdp(ip, count);
    if (ip.protocol === 6) readTcp(ip, count, connections);
  }
  return { names, connections };
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
      destination: [...ip.subarray(16, 20)].join('.'),
      payload: ip.subarray(headerLength, ip.readUInt16BE(2)),
    };
  }
  if (version === 6 && ip.length >= 40) {
    const groups = [];
    for (let i = 24; i < 40; i += 2) groups.push(ip.readUInt16BE(i).toString(16));
    return { protocol: ip[6], destination: `[${groups.join(':')}]`, payload: ip.subarray(40) };
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

/** A new connection (SYN), a TLS ClientHello's server name, or an HTTP request's Host. */
function readTcp({ destination, payload }, count, connections) {
  if (payload.length < 20) return;
  const port = payload.readUInt16BE(2);
  const flags = payload[13];
  if (flags & 0x02 && !(flags & 0x10)) {
    const key = `${destination}:${port}`;
    connections.set(key, (connections.get(key) ?? 0) + 1);
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

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [file, label = 'emulator'] = process.argv.slice(2);
  if (!file) throw new Error('usage: hosts-in-capture.mjs <capture.pcap> [label]');
  for (const line of hostLines(hostsInCapture(readFileSync(file)), label)) console.log(line);
}
