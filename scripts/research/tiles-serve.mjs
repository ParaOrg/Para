// Serves a PMTiles file as plain `/tiles/{z}/{x}/{y}` vector tiles, and a folder of static files.
// Usage: node scripts/research/tiles-serve.mjs <file.pmtiles> [staticDir] [port=8787]
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

import { PmtilesFile } from './tiles-pmtiles.mjs';

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
};
const COMPRESSION_GZIP = 2;

export function startServer({ pmtilesPath, staticDir, port = 0 }) {
  const file = new PmtilesFile(pmtilesPath);
  const server = createServer(async (req, res) => {
    const { pathname } = new URL(req.url ?? '/', 'http://localhost');
    const tile = /^\/tiles\/(\d+)\/(\d+)\/(\d+)$/.exec(pathname);
    if (tile) {
      const bytes = file.tile(Number(tile[1]), Number(tile[2]), Number(tile[3]));
      if (!bytes) {
        res.writeHead(204).end();
        return;
      }
      res.writeHead(200, {
        'Content-Type': 'application/x-protobuf',
        'Content-Length': bytes.length,
        ...(file.header.tileCompression === COMPRESSION_GZIP ? { 'Content-Encoding': 'gzip' } : {}),
      });
      res.end(bytes);
      return;
    }
    if (staticDir) {
      const rel = normalize(pathname === '/' ? '/tiles-render.html' : pathname);
      try {
        const body = await readFile(join(staticDir, rel));
        res.writeHead(200, { 'Content-Type': TYPES[extname(rel)] ?? 'application/octet-stream' });
        res.end(body);
        return;
      } catch {
        // Falls through to the 404 below.
      }
    }
    res.writeHead(404).end();
  });
  return new Promise((resolve) => {
    server.listen(port, '127.0.0.1', () => {
      resolve({
        origin: `http://127.0.0.1:${server.address().port}`,
        close: () => {
          server.close();
          file.close();
        },
      });
    });
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [pmtilesPath, staticDir, port] = process.argv.slice(2);
  const { origin } = await startServer({ pmtilesPath, staticDir, port: Number(port ?? 8787) });
  console.log(`tiles at ${origin}/tiles/{z}/{x}/{y}`);
}
