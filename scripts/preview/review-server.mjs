// Loopback-only preview. The API is the disposable PostgREST container, never Supabase.
import { createServer } from 'node:http';
import { createReadStream, existsSync, readFileSync, statSync } from 'node:fs';
import { resolve, extname } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { previewSession, previewToken } from './review-fixture.mjs';

const run = promisify(execFile);
const root = resolve('/tmp/para-review-preview');
const published = resolve('/tmp/para-review-publish/public/data');
const session = previewSession();
const types = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
};
let isPublishing = false;
const banner = `<div style="height:32px;padding:4px 12px;background:#fff;color:#222;font:14px sans-serif;display:flex;gap:12px;align-items:center"><span>ISOLATED PREVIEW · Provisional UI</span><button id="publish-sample">Publish sample changes</button><span id="preview-result" role="status"></span></div><script>localStorage.setItem('sb-127-auth-token',${JSON.stringify(JSON.stringify(session))});document.getElementById('publish-sample').onclick=async()=>{const e=document.getElementById('preview-result');e.textContent='Publishing…';const r=await fetch('/preview-admin/publish',{method:'POST'});e.textContent=r.ok?'Sample map published. Reload Public view.':'Publication failed; try again.';};</script><style>#root{height:calc(100% - 32px)!important}</style>`;
createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost:4180');
  try {
    if (url.pathname === '/preview-admin/publish' && req.method === 'POST') {
      if (isPublishing) {
        res.writeHead(409).end('Publication in progress');
        return;
      }
      isPublishing = true;
      try {
        await run(
          process.execPath,
          [
            '--experimental-strip-types',
            '--import',
            './scripts/node/ts-resolve.mjs',
            'scripts/publish/publish-map.mjs',
            '--force',
          ],
          {
            cwd: '/tmp/para-review-publish',
            env: {
              ...process.env,
              SUPABASE_URL: 'http://127.0.0.1:4180/api',
              SUPABASE_PUBLISHABLE_KEY: previewToken('anon'),
            },
            maxBuffer: 1024 * 1024,
          },
        );
        res.writeHead(200).end('Published disposable sample data');
      } finally {
        isPublishing = false;
      }
      return;
    }
    if (url.pathname.startsWith('/api/auth/')) {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify(url.pathname.endsWith('/user') ? session.user : session));
      return;
    }
    if (url.pathname.startsWith('/api/rest/v1/')) {
      const path = url.pathname.slice('/api/rest/v1'.length);
      const body = ['GET', 'HEAD'].includes(req.method)
        ? undefined
        : await new Promise((resolveBody, reject) => {
            const chunks = [];
            req.on('data', (chunk) => chunks.push(chunk));
            req.on('end', () => resolveBody(Buffer.concat(chunks)));
            req.on('error', reject);
          });
      const headers = { ...req.headers };
      delete headers.host;
      delete headers['content-length'];
      delete headers['accept-encoding'];
      const response = await fetch(`http://127.0.0.1:4191${path}${url.search}`, {
        method: req.method,
        headers,
        body,
      });
      res.writeHead(
        response.status,
        Object.fromEntries(
          [...response.headers].filter(
            ([key]) => !['content-encoding', 'transfer-encoding', 'content-length'].includes(key),
          ),
        ),
      );
      res.end(Buffer.from(await response.arrayBuffer()));
      return;
    }
    let path = url.pathname;
    if (path.startsWith('/api/storage/v1/object/public/signboards/'))
      path = `/data/signboards/${path.split('/').at(-1)}`;
    let file = path.startsWith('/data/')
      ? resolve(published, path.slice(6))
      : resolve(root, `.${path}`);
    const allowedRoot = path.startsWith('/data/') ? published : root;
    if (!file.startsWith(`${allowedRoot}/`) && file !== allowedRoot) {
      res.writeHead(403).end();
      return;
    }
    if (existsSync(file) && statSync(file).isDirectory()) file = resolve(file, 'index.html');
    if (!existsSync(file)) file = resolve(root, 'index.html');
    if (file.endsWith('.html')) {
      const html = readFileSync(file, 'utf8');
      const content = file.endsWith('/studio/index.html')
        ? html.replace('<body>', `<body>${banner}`)
        : html;
      res.writeHead(200, { 'content-type': 'text/html', 'cache-control': 'no-store' });
      res.end(content);
      return;
    }
    res.writeHead(200, {
      'content-type': types[extname(file)] ?? 'application/octet-stream',
      'cache-control': 'no-store',
    });
    createReadStream(file).pipe(res);
  } catch (error) {
    console.error(error.message);
    if (!res.headersSent) res.writeHead(500);
    res.end('Isolated preview request failed');
  }
}).listen(4180, '127.0.0.1', () =>
  console.log('Isolated review preview: http://localhost:4180/studio/'),
);
