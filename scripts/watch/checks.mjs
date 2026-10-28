// The watch's checks. Each returns { ok, answer }: `answer` says what came back, for the
// issue. They take `fetch` and the time as arguments so the unit checks can fake both.

export const SITE = 'https://www.para-commute.org';
export const BARE_DOMAIN = 'https://para-commute.org';
export const TILES = 'https://tiles.para-commute.org';
// Manila at zoom 10, about 130 KB: a tile the build always holds, cached at the edge.
export const TILE_PATH = '/10/856/470.pbf';
export const STYLE_PATH = '/styles/positron';

export const MAP_MAX_AGE_HOURS = 36;
export const BACKUP_MAX_AGE_DAYS = 8;
export const TILES_BUILD_MAX_AGE_DAYS = 35;

const TRIES = 3;
const TRY_GAP_MS = 20_000;

/** Runs a check up to three times, 20 seconds apart, and keeps the first pass or the last failure. */
export async function withRetries(
  check,
  { tries = TRIES, gapMs = TRY_GAP_MS, sleep = defaultSleep } = {},
) {
  let outcome = { ok: false, answer: 'not run' };
  for (let attempt = 1; attempt <= tries; attempt += 1) {
    try {
      outcome = await check();
    } catch (error) {
      outcome = { ok: false, answer: error instanceof Error ? error.message : String(error) };
    }
    if (outcome.ok) return outcome;
    if (attempt < tries) await sleep(gapMs);
  }
  return outcome;
}

function defaultSleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** The site answers 200 with the app's page, and the bare domain redirects to it. */
export async function checkSite(fetchImpl, site = SITE, bareDomain = BARE_DOMAIN) {
  const page = await fetchImpl(`${site}/`, { redirect: 'manual' });
  const html = await page.text();
  if (page.status !== 200) return { ok: false, answer: `${site}/ answered ${page.status}` };
  if (!html.includes('<div id="root">')) {
    return {
      ok: false,
      answer: `${site}/ answered 200 without the app's page: ${html.slice(0, 200)}`,
    };
  }
  const bare = await fetchImpl(`${bareDomain}/`, { redirect: 'manual' });
  await bare.body?.cancel();
  const location = bare.headers.get('location') ?? '';
  if (bare.status < 300 || bare.status > 399 || !location.startsWith(site)) {
    return {
      ok: false,
      answer: `${bareDomain}/ answered ${bare.status}${location ? ` to ${location}` : ''}, not a redirect to ${site}`,
    };
  }
  return { ok: true, answer: `${site}/ 200, ${bareDomain}/ ${bare.status} to ${location}` };
}

/** The published map's index answers, parses, and was published less than 36 hours ago. */
export async function checkPublishedMap(fetchImpl, now, site = SITE) {
  const url = `${site}/data/index.v5.json`;
  const response = await fetchImpl(url);
  const text = await response.text();
  if (response.status !== 200) return { ok: false, answer: `${url} answered ${response.status}` };
  let publishedAt;
  try {
    publishedAt = JSON.parse(text).published_at;
  } catch {
    return { ok: false, answer: `${url} is not JSON: ${text.slice(0, 200)}` };
  }
  const ageHours = (Date.parse(now) - Date.parse(publishedAt)) / 3_600_000;
  if (!Number.isFinite(ageHours)) {
    return { ok: false, answer: `${url} has no readable published_at (${publishedAt})` };
  }
  const answer = `published_at ${publishedAt}, ${ageHours.toFixed(1)} hours ago`;
  return { ok: ageHours < MAP_MAX_AGE_HOURS, answer };
}

/** One tile and one style answer 200 from the tiles Worker: two requests. */
export async function checkTiles(fetchImpl, tiles = TILES) {
  const answers = [];
  for (const path of [TILE_PATH, STYLE_PATH]) {
    const response = await fetchImpl(`${tiles}${path}`);
    await response.body?.cancel();
    answers.push(`${tiles}${path} ${response.status}`);
    if (response.status !== 200) return { ok: false, answer: answers.join('\n') };
  }
  return { ok: true, answer: answers.join('\n') };
}

/** The newest successful run among `runs` (GitHub's, newest first) counts, if young enough. */
export function checkLastSuccess(runs, events, maxAgeDays, now) {
  const last = runs.find((run) => run.conclusion === 'success' && events.includes(run.event));
  if (!last) return { ok: false, answer: `No successful ${events.join(' or ')} run found` };
  const ageDays =
    (Date.parse(now) - Date.parse(last.run_started_at ?? last.created_at)) / 86_400_000;
  const answer = `Last success ${ageDays.toFixed(1)} days ago: ${last.html_url}`;
  return { ok: ageDays < maxAgeDays, answer };
}

/** True when the newest finished run not made for a pull request succeeded. */
export function lastRunSucceeded(runs) {
  const last = runs.find((run) => run.event !== 'pull_request');
  return last?.conclusion === 'success';
}
