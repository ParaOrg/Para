// The Map Style card's Location Labels switch, driven the same way on the public map
// (commuter-test) and the contributor page (contribute-test): off by default, the basemap's
// labels hidden and ours kept; on, they show; the choice survives a basemap switch and a reload.
// A basemap label is a symbol layer from a source that is not GeoJSON (location-labels.ts).

/** Labels as the map has them now: the basemap's, those of them shown, and ours shown. */
export const labelsNow = (page) =>
  page.evaluate(() => {
    const style = window.__map.getStyle();
    const isOurs = (l) => style.sources[l.source]?.type === 'geojson';
    const isShown = (l) => l.layout?.visibility !== 'none';
    const symbols = style.layers.filter((l) => l.type === 'symbol');
    return {
      ids: style.layers.map((l) => l.id).join(','),
      basemap: symbols.filter((l) => !isOurs(l)).map((l) => l.id),
      basemapShown: symbols.filter((l) => !isOurs(l) && isShown(l)).map((l) => l.id),
      ours: symbols.filter((l) => isOurs(l) && isShown(l)).map((l) => l.id),
    };
  });

/** Until the map's labels are as `holds` says, or `ms` passes; the last read either way. */
const labelsWhen = async (page, holds, ms = 15000) => {
  const end = Date.now() + ms;
  let now = await labelsNow(page);
  while (!holds(now) && Date.now() < end) {
    await page.waitForTimeout(100);
    now = await labelsNow(page);
  }
  return now;
};

const card = (page) => page.getByRole('dialog', { name: 'Map Style' });
const labelsSwitch = (page) => card(page).getByRole('switch', { name: 'Location Labels' });

/** The card, opened from its button unless it is open. */
const openCard = async (page) => {
  if ((await card(page).count()) === 0) await page.getByTestId('basemap').click();
  await card(page).waitFor();
};

/** A design picked on the card, once its style has replaced the one before. */
const pick = async (page, label) => {
  const before = (await labelsNow(page)).ids;
  await card(page).getByRole('button', { name: label, exact: true }).click();
  return labelsWhen(page, (now) => now.ids !== before);
};

const sameIds = (a, b) => [...a].sort().join() === [...b].sort().join();

/**
 * Off, on, a basemap switch, a reload, off again and another switch, each read off the map.
 * `prefix` starts each check's name; `waitForMap` waits for a reloaded page's map.
 */
export async function checkLocationLabels(page, { check, prefix, waitForMap }) {
  const atFirst = await labelsWhen(page, (now) => now.basemap.length > 0);
  await openCard(page);
  check(
    `${prefix}: Location Labels is off by default, and the basemap's labels are hidden`,
    (await labelsSwitch(page).getAttribute('aria-checked')) === 'false' &&
      atFirst.basemap.length > 0 &&
      atFirst.basemapShown.length === 0,
    `${atFirst.basemapShown.length} of ${atFirst.basemap.length} shown`,
  );

  await labelsSwitch(page).click();
  const shown = await labelsWhen(page, (now) => now.basemapShown.length > 0);
  check(
    `${prefix}: on, they show; ours stay as they were, and the choice is kept on the phone`,
    (await labelsSwitch(page).getAttribute('aria-checked')) === 'true' &&
      shown.basemapShown.length > 0 &&
      sameIds(shown.ours, atFirst.ours) &&
      (await page.evaluate(() => localStorage.getItem('para.location-labels.v1'))) === 'shown',
    `${shown.basemapShown.length} of ${shown.basemap.length} shown; ours ${shown.ours.join(', ') || 'none'}`,
  );

  const colour = await pick(page, 'Colour');
  check(
    `${prefix}: a switch to Colour keeps them shown`,
    colour.basemapShown.length > 0 && sameIds(colour.ours, atFirst.ours),
    `${colour.basemapShown.length} of ${colour.basemap.length} shown`,
  );

  await page.reload({ waitUntil: 'load' });
  await waitForMap(page);
  const reloaded = await labelsWhen(page, (now) => now.basemap.length > 0);
  await openCard(page);
  check(
    `${prefix}: after a reload they show from the first style, and the switch is on`,
    reloaded.basemapShown.length > 0 &&
      (await labelsSwitch(page).getAttribute('aria-checked')) === 'true',
    `${reloaded.basemapShown.length} of ${reloaded.basemap.length} shown`,
  );

  await labelsSwitch(page).click();
  const off = await labelsWhen(page, (now) => now.basemapShown.length === 0);
  const fiord = await pick(page, 'Fiord');
  const fiordHidden = await labelsWhen(page, (now) => now.basemap.length > 0);
  check(
    `${prefix}: off again they hide, and a switch to Fiord keeps them hidden; ours stay`,
    off.basemapShown.length === 0 &&
      fiordHidden.basemap.length > 0 &&
      fiordHidden.basemapShown.length === 0 &&
      sameIds(fiordHidden.ours, atFirst.ours) &&
      (await page.evaluate(() => localStorage.getItem('para.location-labels.v1'))) === null,
    `${fiord.basemapShown.length} of ${fiord.basemap.length} shown on Fiord`,
  );
}
