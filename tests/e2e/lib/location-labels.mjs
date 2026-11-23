// The Map Style card's Location Labels switch, driven the same way on the public map
// (commuter-test) and the contributor page (contribute-test): each page's default (on for the
// public map, off for the contributor page), the basemap's labels hidden and ours kept when off;
// on, they show with the establishments over them; the choice survives a basemap switch and a
// reload. A basemap label is a symbol layer from a source that is not GeoJSON (location-labels.ts).

/**
 * Labels as the map has them now: the basemap's, those of them shown, ours shown, and the
 * basemap's place icons (a poi layer with an icon), which keep their train stations with the
 * labels off: class railway, by their icon alone.
 */
export const labelsNow = (page) =>
  page.evaluate(() => {
    const style = window.__map.getStyle();
    const isOurs = (l) => style.sources[l.source]?.type === 'geojson';
    const isShown = (l) => l.layout?.visibility !== 'none';
    // The basemap's own places as markers (establishments-1 to -3), and the places its tiles lack,
    // from Para's own files (establishments-extra, a GeoJSON layer): both go with the labels.
    const isEstablishment = (l) => /^establishments-\d$/.test(l.id);
    const isExtra = (l) => l.id === 'establishments-extra';
    const isStation = (l) =>
      l['source-layer'] === 'poi' && l.layout?.['icon-image'] !== undefined && !isEstablishment(l);
    const symbols = style.layers.filter((l) => l.type === 'symbol');
    const basemap = symbols.filter((l) => !isOurs(l) && !isStation(l) && !isEstablishment(l));
    return {
      establishments: symbols.filter(isEstablishment).map((l) => l.id),
      hasExtra: symbols.some(isExtra),
      ids: style.layers.map((l) => l.id).join(','),
      basemap: basemap.map((l) => l.id),
      basemapShown: basemap.filter(isShown).map((l) => l.id),
      ours: symbols.filter((l) => isOurs(l) && !isExtra(l) && isShown(l)).map((l) => l.id),
      stations: symbols
        .filter((l) => !isOurs(l) && isStation(l))
        .map((l) => ({
          id: l.id,
          isShown: isShown(l),
          hasName: 'text-field' in l.layout,
          isRailwayOnly: JSON.stringify(l.filter ?? null).endsWith(
            '["==",["get","class"],"railway"]]',
          ),
        })),
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
 * The page's default, then off and on, a basemap switch, a reload, off again and another switch,
 * each read off the map. `prefix` starts each check's name; `waitForMap` waits for a reloaded
 * page's map; `isOnByDefault` and `key` are the page's own (location-labels.ts).
 */
export async function checkLocationLabels(
  page,
  { check, prefix, waitForMap, isOnByDefault = false, key = 'para.location-labels.v1' },
) {
  const stored = () => page.evaluate((k) => localStorage.getItem(k), key);
  // What the phone keeps for each state: nothing for the default, the choice away from it.
  const keptOn = isOnByDefault ? null : 'shown';
  const keptOff = isOnByDefault ? 'hidden' : null;
  const atFirst = await labelsWhen(page, (now) =>
    isOnByDefault ? now.establishments.length > 0 : now.basemap.length > 0,
  );
  await openCard(page);
  check(
    `${prefix}: Location Labels is ${isOnByDefault ? 'on' : 'off'} by default, and the basemap's labels ${isOnByDefault ? 'show, with the establishments' : 'are hidden'}`,
    (await labelsSwitch(page).getAttribute('aria-checked')) === String(isOnByDefault) &&
      atFirst.basemap.length > 0 &&
      (isOnByDefault
        ? atFirst.basemapShown.length > 0 && atFirst.establishments.length === 3 && atFirst.hasExtra
        : atFirst.basemapShown.length === 0 &&
          atFirst.establishments.length === 0 &&
          !atFirst.hasExtra) &&
      (await stored()) === null,
    `${atFirst.basemapShown.length} of ${atFirst.basemap.length} shown; establishments ${atFirst.establishments.join(', ') || 'none'}`,
  );
  if (isOnByDefault) {
    await labelsSwitch(page).click();
    const offFirst = await labelsWhen(page, (now) => now.basemapShown.length === 0);
    check(
      `${prefix}: off, the basemap's labels and the establishments go; ours stay, and the choice is kept`,
      offFirst.basemapShown.length === 0 &&
        offFirst.establishments.length === 0 &&
        !offFirst.hasExtra &&
        sameIds(offFirst.ours, atFirst.ours) &&
        (await stored()) === keptOff,
      `${offFirst.basemapShown.length} shown; ours ${offFirst.ours.join(', ') || 'none'}`,
    );
  }

  await labelsSwitch(page).click();
  const shown = await labelsWhen(
    page,
    (now) => now.basemapShown.length > 0 && now.establishments.length > 0,
  );
  check(
    `${prefix}: on, they show with the establishments; ours stay as they were, and the choice is kept on the phone`,
    (await labelsSwitch(page).getAttribute('aria-checked')) === 'true' &&
      shown.basemapShown.length > 0 &&
      shown.establishments.length === 3 &&
      shown.hasExtra &&
      sameIds(shown.ours, atFirst.ours) &&
      (await stored()) === keptOn,
    `${shown.basemapShown.length} of ${shown.basemap.length} shown; ours ${shown.ours.join(', ') || 'none'}`,
  );

  const colour = await pick(page, 'Coloured');
  check(
    `${prefix}: a switch to Coloured keeps them shown, with its own place icons, none of the basemap's establishments, and Para's own`,
    colour.basemapShown.length > 0 &&
      colour.establishments.length === 0 &&
      colour.hasExtra &&
      sameIds(colour.ours, atFirst.ours),
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
  check(
    `${prefix}: off on Coloured, its place icons stay for the train stations alone (class railway), with no names`,
    reloaded.stations.length > 0 &&
      reloaded.stations.every(
        (station) => station.isShown && station.hasName && !station.isRailwayOnly,
      ) &&
      off.stations.length === reloaded.stations.length &&
      off.stations.every((station) => station.isShown && !station.hasName && station.isRailwayOnly),
    JSON.stringify({ on: reloaded.stations, off: off.stations }),
  );
  const dark = await pick(page, 'Dark');
  const fiordHidden = await labelsWhen(page, (now) => now.basemap.length > 0);
  check(
    `${prefix}: off again they hide, and a switch to Dark keeps them hidden; ours stay`,
    off.basemapShown.length === 0 &&
      fiordHidden.basemap.length > 0 &&
      fiordHidden.basemapShown.length === 0 &&
      fiordHidden.establishments.length === 0 &&
      !fiordHidden.hasExtra &&
      sameIds(fiordHidden.ours, atFirst.ours) &&
      (await stored()) === keptOff,
    `${dark.basemapShown.length} of ${dark.basemap.length} shown on Dark`,
  );

  await card(page).getByText('Location Labels', { exact: true }).click();
  check(
    `${prefix}: a tap on the words "Location Labels" flips the switch too`,
    (await labelsSwitch(page).getAttribute('aria-checked')) === 'true',
  );
}
