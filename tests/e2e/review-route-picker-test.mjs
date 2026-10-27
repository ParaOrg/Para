import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { previewToken } from '../../scripts/preview/review-fixture.mjs';
const api = async (path, body) => {
  const response = await fetch(`http://127.0.0.1:4180/api/rest/v1/${path}`, {
    method: body ? 'POST' : 'GET',
    headers: { Authorization: `Bearer ${previewToken()}`, 'content-type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  assert.ok(response.ok);
  return response.json();
};
const beforeRoutes = (await api('route?select=id')).length;
const beforePlaces = (await api('stop?select=id')).length;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
await page.route(/tiles\.openfreemap\.org/, (r) =>
  /\/styles\//.test(r.request().url())
    ? r.fulfill({
        json: {
          version: 8,
          sources: {},
          layers: [{ id: 'bg', type: 'background', paint: { 'background-color': '#eee' } }],
        },
      })
    : r.fulfill({ status: 404, body: '' }),
);
await page.route(/router\.project-osrm\.org|routing\.openstreetmap\.de/, (r) =>
  r.fulfill({ status: 200, json: { code: 'NoRoute', routes: [] } }),
);
await page.goto('http://127.0.0.1:4180/studio/');
await page.getByRole('button', { name: 'New route, terminal or hintuan' }).click();
await page.getByRole('menuitem', { name: /Routes/ }).click();
await page.mouse.click(180, 400);
await page.mouse.click(250, 450);
await page.mouse.click(300, 420);
await page.getByRole('button', { name: /Done/ }).click();
await page.getByTestId('save-head').selectOption({ label: '+ New place here…' });
const group = page.getByRole('group', { name: 'New place for the head', exact: true });
await group.getByLabel(/Ground name/).fill('Preview route head');
await group.getByRole('button', { name: 'Save place', exact: true }).click();
await group.waitFor({ state: 'detached' });
await page.getByTestId('save-tail').selectOption({ label: '+ New place here…' });
const tail = page.getByRole('group', { name: 'New place for the tail', exact: true });
await tail.getByLabel(/Ground name/).fill('Preview route tail');
await tail.getByRole('button', { name: 'Save place', exact: true }).click();
await tail.waitFor({ state: 'detached' });
await page.getByRole('button', { name: 'Save', exact: true }).click();
await page.getByRole('button', { name: 'Save', exact: true }).waitFor({ state: 'detached' });
await page.getByRole('button', { name: /^Drafts \(\d+\)$/ }).click();
const text = await page.getByRole('dialog').innerText();
assert.ok(text.includes('Preview route head'));
assert.ok(text.includes('Preview route tail'));
const drafts = await api('draft?select=*');
const head = drafts.find((row) => row.payload.stop?.name === 'Preview route head');
const tailDraft = drafts.find((row) => row.payload.stop?.name === 'Preview route tail');
const route = drafts.find(
  (row) =>
    row.payload.route?.head_stop_id === head.subject_id &&
    row.payload.route?.tail_stop_id === tailDraft.subject_id,
);
assert.ok(route);
assert.equal((await api('route?select=id')).length, beforeRoutes);
assert.equal((await api('stop?select=id')).length, beforePlaces);
const routeItem = page
  .getByRole('listitem')
  .filter({ hasText: 'Preview route head' })
  .filter({ hasText: 'Preview route tail' });
await routeItem.getByRole('button', { name: 'Review changes', exact: true }).click();
await page.getByRole('button', { name: 'Approve', exact: true }).waitFor();
assert.equal(await page.getByRole('button', { name: 'Approve', exact: true }).isDisabled(), true);
for (const place of [head, tailDraft]) {
  const submitted = await api('rpc/submit_draft', {
    p_draft: place.id,
    p_revision: place.revision,
  });
  assert.equal(
    (
      await api('rpc/approve_reviewed_draft', {
        p_draft: place.id,
        p_revision: submitted.draft.revision,
      })
    ).code,
    'approved',
  );
}
await page.getByRole('button', { name: 'Refresh comparison', exact: true }).click();
await page.waitForFunction(() =>
  [...document.querySelectorAll('button')].some(
    (button) => button.textContent.trim() === 'Approve' && !button.disabled,
  ),
);
await page.getByRole('button', { name: 'Approve', exact: true }).click();
await page.getByRole('button', { name: 'Approve', exact: true }).click();
await page.getByRole('status').filter({ hasText: 'Approved. The Studio map' }).waitFor();
assert.equal((await api(`route?id=eq.${route.subject_id}`)).length, 1);
assert.equal((await api('route?select=id')).length, beforeRoutes + 1);
assert.equal((await api('stop?select=id')).length, beforePlaces + 2);
console.log(
  'PASS: route picker creates both places as drafts stores the dependent route without approved writes, blocks premature approval, then approves it after both places',
);
await browser.close();
