// Hosted sample preview only. It cannot authenticate to the real database.
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { bareStyle, nodeFetch } from './lib/harness.mjs';
const BASE = process.env.PARAPO_REVIEW_DEMO_BASE ?? 'http://127.0.0.1:4182';
const allowed = ['127.0.0.1', 'parapo-studio-review-preview.villaralvorovic2.workers.dev'];
if (!allowed.includes(new URL(BASE).hostname))
  throw new Error('This suite runs only on the isolated sample preview.');
const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1280, height: 900 },
  serviceWorkers: 'block',
});
const page = await context.newPage();
const errors = [];
const liveRequests = [];
page.on('pageerror', (error) => errors.push(error.message));
page.on('request', (request) => {
  if (request.url().includes('.supabase.co')) liveRequests.push(request.url());
});
await nodeFetch(page);
await bareStyle(page);
await page.goto(`${BASE}/review-guide.html`);
await page.getByRole('link', { name: 'Open the functional preview' }).click();
await page.getByRole('button', { name: /^Drafts \(\d+\)$/ }).waitFor();
await page.getByRole('button', { name: 'Reset sample', exact: true }).click();
await page.getByRole('button', { name: /^Drafts \(\d+\)$/ }).click();
let item = page
  .getByRole('listitem')
  .filter({ has: page.getByRole('heading', { name: 'Preview new place', exact: true }) });
await item.getByRole('button', { name: 'Review changes' }).click();
await page.getByRole('textbox', { name: 'Ground name', exact: true }).fill('Hosted reviewed place');
await page.getByRole('button', { name: 'Save draft details', exact: true }).click();
await page.waitForFunction(() =>
  [...document.querySelectorAll('button')].some(
    (button) => button.textContent.trim() === 'Approve' && !button.disabled,
  ),
);
await page.getByRole('button', { name: 'Approve', exact: true }).click();
await page.getByRole('button', { name: 'Approve', exact: true }).click();
await page.getByRole('status').filter({ hasText: 'Approved. The Studio map' }).waitFor();
await page.getByRole('button', { name: 'Waiting for publication', exact: true }).click();
await page.getByRole('listitem').filter({ hasText: 'Hosted reviewed place' }).waitFor();
const snapshot = () =>
  page.evaluate(async () => {
    const response = await fetch('/data/index.v5.json');
    return response.json();
  });
assert.ok(!(await snapshot()).stops.some((stop) => stop.name === 'Hosted reviewed place'));
await page.getByRole('button', { name: 'Close', exact: true }).click();
await page.getByRole('button', { name: 'Publish sample', exact: true }).click();
assert.ok((await snapshot()).stops.some((stop) => stop.name === 'Hosted reviewed place'));
await page.getByText('Public', { exact: true }).click();
await page.getByTitle('Published ParaPo public map').waitFor();
await page.frameLocator('iframe').locator('canvas').waitFor();
await page.getByText('Playground', { exact: true }).click();
const openSubjects = async () => {
  await page.getByRole('button', { name: /^Drafts \(\d+\)$/ }).click();
  await page.getByRole('button', { name: 'Routes and places', exact: true }).click();
  await page.getByRole('textbox', { name: 'Find a route or place' }).fill('Hosted reviewed place');
};
await openSubjects();
await page.getByRole('button', { name: 'Take down…' }).click();
await page.getByRole('button', { name: 'Confirm take down' }).click();
await page.getByRole('button', { name: 'Put back…' }).waitFor();
await page.getByRole('button', { name: 'Close', exact: true }).click();
await page.getByRole('button', { name: 'Publish sample', exact: true }).click();
assert.ok(!(await snapshot()).stops.some((stop) => stop.name === 'Hosted reviewed place'));
await openSubjects();
await page.getByRole('button', { name: 'Put back…' }).click();
await page.getByRole('button', { name: 'Confirm put back' }).click();
await page.getByRole('button', { name: 'Take down…' }).waitFor();
await page.getByRole('button', { name: 'Close', exact: true }).click();
await page.getByRole('button', { name: 'Publish sample', exact: true }).click();
assert.ok((await snapshot()).stops.some((stop) => stop.name === 'Hosted reviewed place'));
await page.getByRole('button', { name: /^Drafts \(\d+\)$/ }).click();
await page.getByRole('button', { name: 'Drafts', exact: true }).click();
const count = await page.getByRole('button', { name: 'Review changes' }).count();
for (let at = 0; at < count; at++) {
  await page.getByRole('button', { name: 'Review changes' }).nth(at).click();
  await page.getByRole('button', { name: 'Refresh comparison' }).waitFor();
  if (await page.getByRole('checkbox', { name: /I compared both/ }).count()) break;
  await page.getByRole('button', { name: 'Back to drafts' }).click();
}
assert.equal(await page.getByRole('button', { name: 'Approve', exact: true }).isDisabled(), true);
await page.getByRole('checkbox', { name: /I compared both/ }).check();
await page.getByRole('button', { name: 'Keep draft for a new review' }).click();
await page.getByRole('button', { name: 'Approve', exact: true }).waitFor();
await page.getByRole('button', { name: 'Discard…' }).click();
await page.getByRole('button', { name: 'Discard draft', exact: true }).click();
await page.getByRole('status').filter({ hasText: 'Draft discarded' }).waitFor();
await page.getByRole('button', { name: 'Close', exact: true }).click();
await page.setViewportSize({ width: 390, height: 844 });
await page.getByRole('button', { name: 'Reset sample', exact: true }).click();
await page.getByRole('button', { name: /^Drafts \(\d+\)$/ }).click();
assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
assert.deepEqual(errors, []);
assert.deepEqual(liveRequests, []);
console.log(
  'PASS: hosted sample review, edit, approval, waiting, publication, Public view, take-down/restore, conflict, discard and phone; zero live Supabase requests',
);
await browser.close();
