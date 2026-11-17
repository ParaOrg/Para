// Every story renders and its play function passes: the built Storybook (storybook-static/, from
// `npm run build-storybook`) served here, each story opened in Playwright's Chromium, and what the
// preview says of it read from its own channel. A failure names the story, its file and the error.
//
// The stories that failed when this check came in are listed, each with its reason, in
// storybook-play-baseline.json, and the list may only shrink: a story not listed that fails, fails
// the check; a listed one that passes now, or is gone, fails it too until its line is deleted.
//
//   npm run build-storybook && node scripts/checks/storybook-play.mjs [storybook-static]
//
// What it relies on, checked against Storybook 10.6.5: the static build's index.json (entries of
// type "story" with id, title, name and importPath); iframe.html?id=<id>&viewMode=story; the
// preview's channel at window.__STORYBOOK_ADDONS_CHANNEL__; and these preview events from
// storybook/internal/core-events: storyFinished ({ storyId, status: 'success' | 'error' }),
// storyErrored ({ title, description }), storyThrewException, playFunctionThrewException and
// unhandledErrorsWhilePlaying. A major Storybook update can rename them: then every story times out
// here, and this comment says what to check.
//
// Every outside host is stood in here only, so the stories reach none: Cloudflare's Turnstile
// (tests/e2e/lib/fake-turnstile.mjs, `byKey`: its script acts as Cloudflare's own test keys do)
// and the basemaps' styles (tests/e2e/lib/stand-ins.mjs's basemap stand-in, for OpenFreeMap and
// for Para's own tiles host alike). A real site key, or any other request off this machine, fails
// the story by name and is never sent. Storybook opened by a person still reaches the real
// hosts, and the e2e suites' live runs (pushes and nightly) keep reaching Cloudflare.
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { chromium } from 'playwright';

import { turnstileScript } from '../../tests/e2e/lib/fake-turnstile.mjs';
import { basemapAnswer } from '../../tests/e2e/lib/stand-ins.mjs';

const ROOT = resolve(process.argv[2] ?? 'storybook-static');
const ONLY = process.env.STORYBOOK_PLAY_ONLY ?? '';
const BASELINE = join(dirname(fileURLToPath(import.meta.url)), 'storybook-play-baseline.json');
const WORKERS = Number(process.env.STORYBOOK_PLAY_WORKERS ?? 4);
const STORY_TIMEOUT_MS = 20_000;
const TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
};

const LOCAL_HOSTS = new Set(['127.0.0.1', 'localhost', '[::1]']);
/** The basemaps' styles the stories ask for, by host: OpenFreeMap's, and Para's own tiles host's. */
const STYLE = /^\/styles\/(positron|liberty|fiord)$/;

/** A stand-in's answer for an outside request, or null when none answers it. */
function standInAnswer(href) {
  const url = new URL(href);
  if (url.hostname === 'challenges.cloudflare.com' && url.pathname === '/turnstile/v0/api.js') {
    return { contentType: 'text/javascript', body: turnstileScript('byKey') };
  }
  // Para's own tiles host serves OpenFreeMap's styles under the same paths; the stand-in's style
  // then asks OpenFreeMap's stand-in for everything else.
  const isStyleOfOwnHost = url.hostname === 'tiles.para-commute.org' && STYLE.test(url.pathname);
  if (url.hostname === 'tiles.openfreemap.org' || isStyleOfOwnHost) {
    const answer = basemapAnswer(`https://tiles.openfreemap.org${url.pathname}`);
    return answer.status === 404 ? null : answer;
  }
  return null;
}

/** Hooks the preview's channel as the page makes it, and keeps what it says of the story. */
function hookChannel() {
  const said = { done: false, status: null, errors: [] };
  globalThis.__paraPlay = said;
  const describe = (error) =>
    error && typeof error === 'object'
      ? [error.message ?? error.title, error.description ?? error.stack].filter(Boolean).join('\n')
      : String(error);
  let channel;
  Object.defineProperty(globalThis, '__STORYBOOK_ADDONS_CHANNEL__', {
    configurable: true,
    get: () => channel,
    set(made) {
      channel = made;
      made.on('storyFinished', ({ status }) => {
        said.status = status;
        said.done = true;
      });
      made.on('storyErrored', (error) => said.errors.push(describe(error)));
      made.on('storyThrewException', (error) => said.errors.push(describe(error)));
      made.on('playFunctionThrewException', (error) => said.errors.push(describe(error)));
      made.on('unhandledErrorsWhilePlaying', (errors) => said.errors.push(...errors.map(describe)));
    },
  });
}

/** Serves the static build on a free port; resolves with its address and its close. */
function serve(root) {
  const server = createServer((request, response) => {
    const path = normalize(decodeURIComponent(new URL(request.url, 'http://x').pathname));
    const file = join(root, path === '/' ? 'index.html' : path);
    if (!file.startsWith(root) || !existsSync(file)) {
      response.writeHead(404).end();
      return;
    }
    response.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' });
    response.end(readFileSync(file));
  });
  return new Promise((done) =>
    server.listen(0, '127.0.0.1', () =>
      done({ base: `http://127.0.0.1:${server.address().port}`, close: () => server.close() }),
    ),
  );
}

/** Opens one story and answers what became of it: null when it passed, else why it failed. */
async function runStory(page, base, story) {
  const unanswered = [];
  page.__paraUnanswered = unanswered;
  await page.goto(`${base}/iframe.html?id=${encodeURIComponent(story.id)}&viewMode=story`);
  const finished = await page
    .waitForFunction(() => globalThis.__paraPlay?.done, null, { timeout: STORY_TIMEOUT_MS })
    .then(
      () => true,
      () => false,
    );
  const said = await page.evaluate(() => globalThis.__paraPlay);
  const refused = await page.evaluate(() => globalThis.__paraTurnstileRefused ?? []);
  if (refused.length)
    return `Turnstile stand-in refused a key that is not a test key: ${refused.join(', ')}`;
  if (unanswered.length)
    return `outside requests no stand-in answers, not sent: ${unanswered.join(', ')}`;
  if (!finished)
    return `did not finish in ${STORY_TIMEOUT_MS / 1000} s${said.errors.length ? `: ${said.errors.join('\n')}` : ''}`;
  if (said.status === 'success' && said.errors.length === 0) return null;
  return said.errors.join('\n') || `finished as ${said.status}`;
}

if (!existsSync(join(ROOT, 'index.json'))) {
  console.error(`No Storybook build at ${ROOT}: run \`npm run build-storybook\` first.`);
  process.exit(1);
}
const stories = Object.values(JSON.parse(readFileSync(join(ROOT, 'index.json'), 'utf8')).entries)
  .filter((entry) => entry.type === 'story')
  // STORYBOOK_PLAY_ONLY=<text>: only the stories whose id holds it, every failure said, while fixing.
  .filter((entry) => !ONLY || entry.id.includes(ONLY));
const { base, close } = await serve(ROOT);
const browser = await chromium.launch({
  ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
  // No outside host resolves: what the stand-ins do not answer, a preconnect included, cannot
  // leave the machine either.
  args: ['--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE localhost, EXCLUDE 127.0.0.1'],
});
// The stories listed as failing, by id, whatever their area.
const listed = new Map(
  Object.values(JSON.parse(readFileSync(BASELINE, 'utf8')).areas).flatMap((stories) =>
    Object.entries(stories),
  ),
);
const failed = new Set();
const problems = [];
let next = 0;
await Promise.all(
  Array.from({ length: WORKERS }, async () => {
    const page = await browser.newPage({ viewport: { width: 1024, height: 768 } });
    await page.addInitScript(hookChannel);
    // Every request off this machine: a stand-in answers it, or it is refused and noted for the
    // story. Nothing is sent.
    await page.route(
      (url) => /^https?:$/.test(url.protocol) && !LOCAL_HOSTS.has(url.hostname),
      (route) => {
        const answer = standInAnswer(route.request().url());
        if (answer) return route.fulfill(answer);
        page.__paraUnanswered?.push(route.request().url());
        return route.abort();
      },
    );
    while (next < stories.length) {
      const story = stories[next++];
      const why = await runStory(page, base, story).catch((error) => String(error));
      if (!why) continue;
      failed.add(story.id);
      if (listed.has(story.id) && !ONLY) continue;
      problems.push(story.id);
      console.error(
        `FAIL  ${story.title} › ${story.name} (${story.importPath}, ${story.id})\n${why.replace(/^/gm, '      ')}`,
      );
    }
    await page.close();
  }),
);
await browser.close();
close();
const ids = new Set(stories.map((story) => story.id));
for (const id of ONLY ? [] : listed.keys()) {
  let stale = null;
  if (!ids.has(id)) stale = 'listed in the baseline, but there is no such story now';
  else if (!failed.has(id)) stale = 'listed in the baseline, but it passes now';
  if (stale === null) continue;
  problems.push(id);
  console.error(`FAIL  ${id}: ${stale}. Delete its line from storybook-play-baseline.json.`);
}
const stillListed = [...failed].filter((id) => listed.has(id)).length;
console.info(
  `${stories.length - failed.size} of ${stories.length} stories rendered and played; ${stillListed} failed as listed in the baseline.`,
);
process.exit(problems.length === 0 ? 0 : 1);
