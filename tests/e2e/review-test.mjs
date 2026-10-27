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
await page.getByRole('button', { name: /^Drafts \(\d+\)$/ }).waitFor();
const shot = (name) => page.screenshot({ path: `${out}/${name}.png` });
// Draw and save through the real form: approved rows must remain unchanged.
const beforeStops = (await api('stop?select=id')).length;
await page.getByRole('button', { name: 'New route, terminal or hintuan' }).click();
await page.getByRole('menuitem', { name: /Hintuan/ }).click();
for (const [x, y] of [
  [180, 300],
  [210, 300],
  [210, 330],
  [180, 330],
])
  await page.mouse.click(x, y);
await page.getByRole('button', { name: /Done/ }).click();
await page.getByPlaceholder('SM Fairview Ilalim').fill('Browser-drawn draft place');
await page.getByRole('button', { name: 'Save hintuan', exact: true }).click();
await page
  .getByRole('button', { name: 'Save hintuan', exact: true })
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
await shot('01-playground-markers');
await page.getByRole('button', { name: /^Drafts \(\d+\)$/ }).click();
await page.getByRole('button', { name: 'Review changes' }).first().waitFor();
await shot('02-review-list');
const li = page
  .getByRole('listitem')
  .filter({ has: page.getByRole('heading', { name: 'Preview new place', exact: true }) });
await li.getByRole('button', { name: 'Review changes' }).click();
await page
  .getByRole('region', { name: 'What this draft does' })
  .getByText('Adds this place')
  .waitFor();
await shot('03-draft-comparison');
await page
  .getByRole('textbox', { name: 'Ground name', exact: true })
  .fill('Preview approved place');
await page.getByRole('button', { name: 'Save draft details' }).click();
await page.waitForFunction(() =>
  [...document.querySelectorAll('button')].some(
    (button) => button.textContent.trim() === 'Approve' && !button.disabled,
  ),
);
await page.getByRole('button', { name: 'Approve', exact: true }).click();
await shot('04-approve');
await page.getByRole('button', { name: 'Approve', exact: true }).click();
await page
  .getByRole('status')
  .filter({ hasText: 'Approved. The Studio map shows it now' })
  .waitFor();
const subjectId = '10000000-0000-4000-8000-000000000001';
assert.equal((await api(`stop?id=eq.${subjectId}`))[0].name, 'Preview approved place');
let publicIndex = await (await fetch(`${BASE}/data/index.v5.json`)).json();
assert.equal(
  publicIndex.stops.some((stop) => stop.id === subjectId),
  false,
  'approval does not publish',
);
await page.getByRole('button', { name: 'Waiting for publication', exact: true }).click();
await page.getByRole('heading', { name: 'Waiting for publication', exact: true }).waitFor();
await shot('08-waiting-for-publication');
await page.getByRole('button', { name: 'Close', exact: true }).click();
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
await shot('07-public-view');
await page.getByText('Playground', { exact: true }).click();
await page.getByRole('button', { name: /^Drafts \(\d+\)$/ }).click();
await page.getByRole('button', { name: 'Routes and places', exact: true }).click();
await page.getByRole('textbox', { name: 'Find a route or place' }).fill('Preview approved place');
await page.getByRole('button', { name: 'Take down…' }).click();
await shot('06-take-down');
await page.getByRole('button', { name: 'Confirm take down' }).click();
await page.getByRole('button', { name: 'Put back…' }).waitFor();
assert.equal((await api(`stop?id=eq.${subjectId}`))[0].status, 'taken_down');
await page.getByRole('button', { name: 'Put back…' }).click();
await shot('06-put-back');
await page.getByRole('button', { name: 'Confirm put back' }).click();
await page.getByRole('button', { name: 'Take down…' }).waitFor();
assert.equal((await api(`stop?id=eq.${subjectId}`))[0].status, 'approved');
await page.getByRole('button', { name: 'Drafts', exact: true }).click();
const drafts = await api('draft?select=*');
const conflict = drafts.find((draft) => draft.kind === 'route' && draft.status === 'pending');
assert.ok(conflict);
// Open each remaining route until its conflict panel is found.
for (let at = 0; at < (await page.getByRole('button', { name: 'Review changes' }).count()); at++) {
  await page.getByRole('button', { name: 'Review changes' }).nth(at).click();
  await page.getByRole('button', { name: 'Refresh comparison' }).waitFor();
  if (await page.getByRole('checkbox', { name: /I compared both/ }).count()) break;
  await page.getByRole('button', { name: 'Back to drafts' }).click();
}
assert.equal(await page.getByRole('button', { name: 'Approve', exact: true }).isDisabled(), true);
await shot('09-conflict');
await page.getByRole('checkbox', { name: /I compared both/ }).check();
await page.getByRole('button', { name: 'Keep draft for a new review' }).click();
// The keep's own answer, not Approve, which was on screen (disabled) before it.
await page
  .getByRole('status')
  .filter({ hasText: 'Draft kept. Submit it again when ready.' })
  .waitFor();
await page.getByRole('button', { name: 'Approve', exact: true }).waitFor();
await page.getByRole('button', { name: 'Discard…' }).click();
await shot('05-discard');
await page.getByRole('button', { name: 'Discard draft', exact: true }).click();
await page.getByRole('status').filter({ hasText: 'Draft discarded' }).waitFor();
await page.getByRole('button', { name: 'Close', exact: true }).click();
await page.setViewportSize({ width: 390, height: 844 });
await page.getByRole('button', { name: /^Drafts \(\d+\)$/ }).click();
await shot('10-phone-review');
assert.deepEqual(errors, []);
console.log(
  'PASS: draft → edit details → approve → wait → publish → Public, take down/put back, conflict, discard, mobile; no page errors',
);
await browser.close();
