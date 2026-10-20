// Loopback-only preview of contributor uploads: the contributor page and the
// studio from one build, against the disposable PostgREST container (never
// Supabase). It stands in for Supabase Auth with the two sign-ins the pages
// use: a phone's anonymous one, which adds an anonymous auth user to the
// disposable database, and the preview editor's password one. Tokens are
// signed with the public demo key in review-fixture.mjs, which only the
// disposable PostgREST trusts.
//
//   node scripts/preview/contributions-server.mjs
//
// PREVIEW_DIST (default /tmp/parapo-contributions-preview), PREVIEW_PSQL (a
// `docker exec … psql` for the preview container) and PREVIEW_API
// (default http://127.0.0.1:4291) may be set.
import { createServer } from 'node:http';
import { createHmac, randomUUID } from 'node:crypto';
import { createReadStream, existsSync, readFileSync, statSync } from 'node:fs';
import { resolve, extname } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

import { PREVIEW_JWT_SECRET, PREVIEW_USER_ID } from './review-fixture.mjs';

const run = promisify(execFile);
const PORT = 4280;
const root = resolve(process.env.PREVIEW_DIST ?? '/tmp/parapo-contributions-preview');
const api = process.env.PREVIEW_API ?? 'http://127.0.0.1:4291';
const psql = (
  process.env.PREVIEW_PSQL ?? 'docker exec -i parapo-preview-db psql -U postgres'
).split(' ');
if (psql[0] !== 'docker' || psql[1] !== 'exec')
  throw new Error('PREVIEW_PSQL must be a local docker exec');
if (!/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(api))
  throw new Error('PREVIEW_API must be loopback');

const EDITOR_EMAIL = 'preview@parapo.test';
const types = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
  '.webmanifest': 'application/manifest+json',
};

const b64 = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
function sign(claims) {
  const head = `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64(claims)}`;
  return `${head}.${createHmac('sha256', PREVIEW_JWT_SECRET).update(head).digest('base64url')}`;
}
function verify(token) {
  const [head, body, signature] = (token ?? '').split('.');
  if (!head || !body || !signature) return null;
  const expected = createHmac('sha256', PREVIEW_JWT_SECRET)
    .update(`${head}.${body}`)
    .digest('base64url');
  if (expected !== signature) return null;
  const claims = JSON.parse(Buffer.from(body, 'base64url').toString());
  return claims.exp > Date.now() / 1000 ? claims : null;
}

function userOf(id, isAnonymous) {
  return {
    id,
    aud: 'authenticated',
    role: 'authenticated',
    email: isAnonymous ? '' : EDITOR_EMAIL,
    is_anonymous: isAnonymous,
    app_metadata: { provider: isAnonymous ? 'anonymous' : 'email' },
    user_metadata: {},
    created_at: '2026-10-19T00:00:00Z',
  };
}
function sessionOf(id, isAnonymous) {
  const exp = Math.floor(Date.now() / 1000) + 3600;
  return {
    access_token: sign({
      role: 'authenticated',
      aud: 'authenticated',
      sub: id,
      is_anonymous: isAnonymous,
      exp,
    }),
    refresh_token: `preview-${isAnonymous ? 'phone' : 'editor'}-${id}`,
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: exp,
    user: userOf(id, isAnonymous),
  };
}

const readBody = (req) =>
  new Promise((done, fail) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => done(Buffer.concat(chunks)));
    req.on('error', fail);
  });
const sendJson = (res, status, body) => {
  res.writeHead(status, { 'content-type': 'application/json' });
  res.end(JSON.stringify(body));
};

async function auth(req, res, path, url) {
  if (path === '/signup' && req.method === 'POST') {
    const id = randomUUID();
    await run(psql[0], [
      ...psql.slice(1),
      '-qc',
      `insert into auth.users (id, is_anonymous) values ('${id}', true)`,
    ]);
    return sendJson(res, 200, sessionOf(id, true));
  }
  if (path === '/token' && req.method === 'POST') {
    const body = JSON.parse((await readBody(req)).toString() || '{}');
    const grant = url.searchParams.get('grant_type');
    if (grant === 'password') {
      if (body.email !== EDITOR_EMAIL) {
        return sendJson(res, 400, {
          error: 'invalid_grant',
          error_description: 'Invalid login credentials',
        });
      }
      return sendJson(res, 200, sessionOf(PREVIEW_USER_ID, false));
    }
    if (grant === 'refresh_token') {
      const match = /^preview-(phone|editor)-(.+)$/.exec(body.refresh_token ?? '');
      if (!match) return sendJson(res, 400, { error: 'invalid_grant' });
      return sendJson(res, 200, sessionOf(match[2], match[1] === 'phone'));
    }
  }
  if (path === '/user' && req.method === 'GET') {
    const claims = verify((req.headers.authorization ?? '').replace(/^Bearer /, ''));
    if (!claims) return sendJson(res, 401, { msg: 'invalid token' });
    return sendJson(res, 200, userOf(claims.sub, claims.is_anonymous === true));
  }
  if (path === '/logout') {
    res.writeHead(204).end();
    return;
  }
  return sendJson(res, 404, { msg: `not in the preview's auth: ${req.method} ${path}` });
}

async function rest(req, res, path, url) {
  const body = ['GET', 'HEAD'].includes(req.method) ? undefined : await readBody(req);
  const headers = { ...req.headers };
  delete headers.host;
  delete headers['content-length'];
  delete headers['accept-encoding'];
  // The publishable key the build carries is not a token PostgREST knows: a
  // request with no session reads as anon, as Supabase's gateway would.
  if (!verify((headers.authorization ?? '').replace(/^Bearer /, ''))) delete headers.authorization;
  const response = await fetch(`${api}${path}${url.search}`, { method: req.method, headers, body });
  res.writeHead(
    response.status,
    Object.fromEntries(
      [...response.headers].filter(
        ([key]) => !['content-encoding', 'transfer-encoding', 'content-length'].includes(key),
      ),
    ),
  );
  res.end(Buffer.from(await response.arrayBuffer()));
}

function file(res, path) {
  let target = resolve(root, `.${path}`);
  if (!target.startsWith(`${root}/`) && target !== root) {
    res.writeHead(403).end();
    return;
  }
  if (existsSync(target) && statSync(target).isDirectory()) target = resolve(target, 'index.html');
  if (!existsSync(target)) target = resolve(root, 'index.html');
  res.writeHead(200, {
    'content-type': types[extname(target)] ?? 'application/octet-stream',
    'cache-control': 'no-store',
  });
  if (target.endsWith('.html')) {
    const banner =
      '<div style="position:fixed;z-index:9999;left:0;right:0;bottom:0;padding:2px 8px;background:#111;color:#fff;font:12px sans-serif;text-align:center;pointer-events:none">ISOLATED PREVIEW · disposable data · provisional UI</div>';
    res.end(readFileSync(target, 'utf8').replace('</body>', `${banner}</body>`));
    return;
  }
  createReadStream(target).pipe(res);
}

createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  try {
    if (url.pathname.startsWith('/api/auth/v1/')) {
      return await auth(req, res, url.pathname.slice('/api/auth/v1'.length), url);
    }
    if (url.pathname.startsWith('/api/rest/v1/')) {
      return await rest(req, res, url.pathname.slice('/api/rest/v1'.length), url);
    }
    file(res, url.pathname);
  } catch (error) {
    console.error(error.message);
    if (!res.headersSent) res.writeHead(500);
    res.end('Isolated preview request failed');
  }
}).listen(PORT, '127.0.0.1', () =>
  console.log(`Isolated contributions preview: http://127.0.0.1:${PORT}/contribute/ and /studio/`),
);
