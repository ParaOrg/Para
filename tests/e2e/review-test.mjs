// This suite requires scripts/preview/review-server.mjs and the disposable DB.
// It refuses a deployed URL and never writes to Supabase.
import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright';
import { previewToken } from '../../scripts/preview/review-fixture.mjs';
import { bareStyle } from './lib/harness.mjs';
const BASE = process.env.PARA_REVIEW_BASE ?? 'http://127.0.0.1:4180';
if (new URL(BASE).hostname !== '127.0.0.1')
  throw new Error('Review tests require the isolated loopback preview.');
const out = '/tmp/para-review-screenshots';
mkdirSync(out, { recursive: true });
const api = async (path, options = {}) => {
  const response = await fetch(`${BASE}/api/rest/v1/${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${previewToken()}`,
      'content-type': 'application/json',
      ...options.headers,
    },
  });
  if (!response.ok) throw new Error(`${path}: ${await response.text()}`);
  return response.status === 204 ? null : response.json();
};
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
await bareStyle(page);
await page.goto(`${BASE}/studio/`);
// Every draft has a mark on the map; a tap opens it into its sidebar (useOpenDraft).
const marks = page.getByRole('button', { name: /^Draft: / });
await marks.first().waitFor();
const shot = (name) => page.screenshot({ path: `${out}/${name}.png` });
const toast = (text) => page.getByText(text).first().waitFor();
page.on('dialog', (dialog) => void dialog.accept());
// Draw and save through the real form: approved rows must remain unchanged.
const beforeStops = (await api('stop?select=id')).length;
await page.getByRole('button', { name: 'New route, terminal or hintuan' }).click();
await page.getByRole('menuitem', { name: /Hintuan/ }).click();
// On the map, right of the sidebar, whose hintuan form is open from the first corner.
for (const [x, y] of [
  [700, 300],
  [730, 300],
  [730, 330],
  [700, 330],
])
  await page.mouse.click(x, y);
await page.getByPlaceholder('SM Fairview Ilalim').fill('Browser-drawn draft place');
await page.getByRole('button', { name: 'Save as draft', exact: true }).click();
await page
  .getByRole('button', { name: 'Save as draft', exact: true })
  .waitFor({ state: 'detached' });
assert.equal(
  (await api('stop?select=id')).length,
  beforeStops,
  'saving a draft leaves approved places unchanged',
);
assert.ok(
  (await api('draft?select=*')).some(
    (draft) => draft.payload.stop?.name === 'Browser-drawn draft place',
  ),
);
await shot('01-playground-marks');

// A new place's draft opens in its sidebar, on the draft; Approve with a field changed saves it
// and then publishes it, at the revision just saved.
await page.getByRole('button', { name: 'Draft: Preview new place' }).dispatchEvent('click');
const hotspotPanel = page.getByTestId('hotspot-panel');
await hotspotPanel.waitFor();
assert.equal(await page.getByPlaceholder('SM Fairview Ilalim').inputValue(), 'Preview new place');
assert.ok(await hotspotPanel.getByText('Draft', { exact: true }).first().isVisible());
await shot('02-draft-sidebar');
await page.getByPlaceholder('SM Fairview Ilalim').fill('Preview approved place');
await hotspotPanel.getByRole('button', { name: 'Approve', exact: true }).click();
await toast('Published. The Studio map shows it now');
const subjectId = '10000000-0000-4000-8000-000000000001';
assert.equal((await api(`stop?id=eq.${subjectId}`))[0].name, 'Preview approved place');
assert.equal((await api(`draft?subject_id=eq.${subjectId}`)).length, 0, 'the draft is gone');
let publicIndex = await (await fetch(`${BASE}/data/index.v5.json`)).json();
assert.equal(
  publicIndex.stops.some((stop) => stop.id === subjectId),
  false,
  'approval does not publish',
);
await page.getByRole('button', { name: 'Publish sample changes' }).click();
await page
  .getByRole('status')
  .filter({ hasText: 'Sample map published' })
  .waitFor({ timeout: 90000 });
publicIndex = await (await fetch(`${BASE}/data/index.v5.json`)).json();
assert.equal(
  publicIndex.stops.some((stop) => stop.id === subjectId),
  true,
  'published snapshot contains approved place',
);
await page.getByText('Public', { exact: true }).click();
await page.getByTitle('Published Para public map').waitFor();
await shot('03-public-view');
await page.getByText('Playground', { exact: true }).click();

// Take down and put back, from the studio's search (the owner's Q121): the place just published.
const search = page.getByTestId('studio-search');
await search.getByRole('combobox', { name: 'Search places' }).fill('Preview approved');
const statusList = search.getByRole('list', { name: /take down or put back/i });
await statusList.getByRole('button', { name: 'Take down' }).first().waitFor();
await shot('04-search-take-down');
await statusList.getByRole('button', { name: 'Take down' }).first().click();
await search.getByRole('status').filter({ hasText: 'Updated published data' }).waitFor();
assert.equal((await api(`stop?id=eq.${subjectId}`))[0].status, 'taken_down', 'taken down');
await statusList.getByRole('button', { name: 'Put back' }).first().waitFor();
await shot('05-search-put-back');
await statusList.getByRole('button', { name: 'Put back' }).first().click();
await statusList.getByRole('button', { name: 'Take down' }).first().waitFor();
assert.equal((await api(`stop?id=eq.${subjectId}`))[0].status, 'approved', 'put back');
await search.getByRole('combobox', { name: 'Search places' }).fill('');

// The seeded route drafts, one built on a revision another editor has since changed. Approve on
// each, unchanged, publishes it as stored; the stale one is refused with a conflict, Keep my
// draft moves it onto the approved revision now (refresh_draft_base), and Approve then lands.
const routes = await api('route?select=id,revision');
const stale = (await api('draft?select=*')).find(
  (draft) =>
    draft.kind === 'route' &&
    routes.some((route) => route.id === draft.subject_id && route.revision !== draft.base_revision),
);
assert.ok(stale, 'the seed has a stale route draft');
const routePanel = page.getByTestId('route-panel');
let isConflictSeen = false;
for (let tries = 0; tries < 3 && !isConflictSeen; tries++) {
  const routeMarks = page.getByRole('button', { name: /^Draft: (?!Browser-drawn)/ });
  await routeMarks.first().dispatchEvent('click');
  await routePanel.waitFor();
  await routePanel.getByRole('button', { name: 'Approve', exact: true }).waitFor();
  await routePanel.getByRole('button', { name: 'Approve', exact: true }).click();
  const outcome = await Promise.race([
    routePanel.waitFor({ state: 'detached' }).then(() => 'approved'),
    routePanel
      .getByRole('alert')
      .filter({ hasText: 'Another editor published a change since this draft began' })
      .waitFor()
      .then(() => 'conflict'),
  ]);
  if (outcome === 'conflict') isConflictSeen = true;
}
assert.ok(isConflictSeen, 'the stale draft is refused with a conflict');
assert.ok(
  (await api(`draft?id=eq.${stale.id}`)).length === 1,
  'a refused approval keeps the draft',
);
await routePanel.getByRole('alert').scrollIntoViewIfNeeded();
await shot('06-conflict-keep-my-draft');
await routePanel.getByRole('button', { name: 'Keep my draft', exact: true }).click();
await routePanel.getByText('Draft kept on the latest published version').waitFor();
const live = (await api(`route?id=eq.${stale.subject_id}&select=revision`))[0].revision;
assert.equal(
  (await api(`draft?id=eq.${stale.id}`))[0].base_revision,
  live,
  'Keep my draft moves the draft onto the approved revision now',
);
await routePanel.getByText('Draft kept on the latest published version').scrollIntoViewIfNeeded();
await shot('07-kept');
await routePanel.getByRole('button', { name: 'Approve', exact: true }).click();
await routePanel.waitFor({ state: 'detached' });
assert.equal((await api(`draft?id=eq.${stale.id}`)).length, 0, 'the kept draft is approved');

// The browser-drawn place's own draft, discarded from its sidebar.
await page.getByRole('button', { name: 'Draft: Browser-drawn draft place' }).dispatchEvent('click');
const placePanel = page.getByTestId('hotspot-panel');
await placePanel.getByRole('button', { name: 'Discard', exact: true }).click();
await toast('Draft discarded');
assert.ok(
  !(await api('draft?select=*')).some((d) => d.payload.stop?.name === 'Browser-drawn draft place'),
  'Discard drops the draft',
);

// On a phone the studio still opens with its drafts' marks.
await page.setViewportSize({ width: 390, height: 844 });
await shot('08-phone');
assert.deepEqual(errors, []);
console.log(
  'PASS: draft → open from its mark → Approve → wait → publish → Public; take down and put back from search; stale draft refused, kept, approved; discard; phone; no page errors',
);
await browser.close();
