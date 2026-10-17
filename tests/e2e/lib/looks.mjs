// Reading the route lines' looks off the map: the directions a source has lit
// and the lines' paint, read by what lookReaders puts in the page, and the lit
// line's colours now, and the end circles' (DOM markers, EndTitles); and the
// GL programs the map has compiled. lookReaders: commuter-test, phone-test and
// group-test. paintNow, rideLook, endRings, colourOf, ringVar, ringed,
// programsAtRest and programsSince: commuter-test and phone-test.

/**
 * In the page, before the app starts (`page.addInitScript(lookReaders)`):
 * window.__lit, window.__paint, window.__ends and window.__colour. It runs
 * in the page, so it uses nothing from this file.
 */
export function lookReaders() {
  // Since 2026-09-25 a tap is feature state, not a filter or a paint
  // expression naming ids (useLighting in src/features/routes/map/lighting.ts).
  // The directions a source has lit.
  window.__lit = async (src) => {
    const m = window.__map;
    const fc = await m?.getSource(src)?.getData();
    if (!fc) return null;
    return [...new Set(fc.features.map((f) => f.properties.id))].filter(
      (id) => !!m.getFeatureState({ source: src, id }).lit,
    );
  };
  // The route lines' paint, the owner's two looks of 2026-09-29: the colour a
  // line rests in, the colour of the lit copy drawn over it, and any
  // saved-routes layer whose opacity shades a line rather than switching it
  // on or off — the outputs of its expression, read branch by branch.
  window.__paint = () => {
    const m = window.__map;
    const outputs = (e) =>
      typeof e === 'number'
        ? [e]
        : !Array.isArray(e)
          ? []
          : e[0] === 'case'
            ? [...e.slice(2, -1).filter((_, i) => i % 2 === 0), e.at(-1)].flatMap(outputs)
            : e[0] === 'step'
              ? [e[2], ...e.slice(4).filter((_, i) => i % 2 === 0)].flatMap(outputs)
              : e[0] === 'interpolate'
                ? e
                    .slice(4)
                    .filter((_, i) => i % 2 === 0)
                    .flatMap(outputs)
                : [];
    const shaded = m
      .getStyle()
      .layers.filter((l) => l.id.startsWith('saved-routes') && l.type === 'line')
      .flatMap((l) =>
        outputs(m.getPaintProperty(l.id, 'line-opacity') ?? 1)
          .filter((o) => o > 0 && o < 1)
          .map((o) => `${l.id} at ${o}`),
      );
    return {
      rest: m.getPaintProperty('saved-routes-line', 'line-color'),
      // Each train line at rest, in its own line's pale (2026-10-13): null where the layer is missing.
      rails: Object.fromEntries(
        ['lrt-1', 'lrt-2', 'mrt-3'].map((l) => [
          l,
          m.getLayer(`saved-routes-rail-${l}`)
            ? m.getPaintProperty(`saved-routes-rail-${l}`, 'line-color')
            : null,
        ]),
      ),
      lit: m.getPaintProperty('saved-routes-selected', 'line-color'),
      shaded,
    };
  };
  // A lit ride's ends on the map, DOM markers since 2026-10-12 (EndTitles;
  // a circle layer's features, direction-ends, until then): which end, its
  // name, whether it carries the name (a pill over it), where it is, and its
  // circle's ring as the DOM computes it, paled along a drawn rest.
  window.__ends = () =>
    [...document.querySelectorAll('[data-testid="end-title"], [data-testid="end-circle"]')].map(
      (e) => ({
        end: e.dataset.end === 'head' ? 'from' : 'to',
        name: e.dataset.name,
        named: e.dataset.testid === 'end-title',
        at: e.dataset.at.split(',').map(Number),
        paled: e.hasAttribute('data-paled'),
        ring: getComputedStyle(e.querySelector('[data-part="circle"] > span')).backgroundColor,
        // The pill's opacity, 0.6 outside the ride (Label's Unselected); null with no pill.
        fade:
          e.dataset.testid === 'end-title'
            ? getComputedStyle(e.querySelector('[data-part="name"]')).opacity
            : null,
      }),
    );
  // A colour as the page computes it, through a probe span — a token's
  // variable, var(--card-red-surface) — so a class's oklch and a layer's
  // hex compare on the page's own terms.
  window.__colour = (background) => {
    const probe = document.createElement('span');
    probe.style.backgroundColor = background;
    document.body.append(probe);
    const colour = getComputedStyle(probe).backgroundColor;
    probe.remove();
    return colour;
  };
}

/** The route lines' paint now (window.__paint), or null while their layer is not there yet. */
export const paintNow = (page) =>
  page.evaluate(() => (window.__map.getLayer('saved-routes-line') ? window.__paint() : null));

/** The lit line's paint now: its colour and its chevrons'. The end circles are endRings'. */
export const rideLook = (page) =>
  page.evaluate(() => {
    const m = window.__map;
    const get = (layer, prop) => (m.getLayer(layer) ? m.getPaintProperty(layer, prop) : null);
    return {
      line: get('saved-routes-selected', 'line-color'),
      arrow: get('direction-arrow-chevrons', 'fill-color'),
    };
  });

/**
 * The end circles now (window.__ends): how many, the rings they wear, bare
 * and paled, as the DOM computes them, and their pills' opacities likewise.
 */
export const endRings = (page) =>
  page.evaluate(() => {
    const ends = window.__ends();
    const worn = (list) => [...new Set(list.map((e) => e.ring))];
    const fades = (list) => [...new Set(list.filter((e) => e.fade !== null).map((e) => e.fade))];
    return {
      circles: ends.length,
      rings: worn(ends.filter((e) => !e.paled)),
      paledRings: worn(ends.filter((e) => e.paled)),
      fades: fades(ends.filter((e) => !e.paled)),
      paledFades: fades(ends.filter((e) => e.paled)),
    };
  });

/** A colour as the page computes it (window.__colour): `var(--card-red-surface)`. */
export const colourOf = (page, background) => page.evaluate((b) => window.__colour(b), background);

/**
 * The variable the end circles' ring reads for `livery` (livery-card.ts):
 * a jeepney card's Card/<livery>/surface, a train's its line's
 * Map/Rail/<line>/surface (2026-10-13), or the selected blue's for null
 * (EndTitles).
 */
export const ringVar = (livery) =>
  !livery
    ? 'var(--map-route-line-surface-selected)'
    : /rail-way/.test(livery)
      ? `var(--map-rail-${livery}-surface)`
      : `var(--card-${livery}-surface)`;

/** Whether every end circle (endRings) rings in `want`, none paled: one colour, the one asked. */
export const ringed = (rings, want) =>
  rings.circles > 0 &&
  rings.paledRings.length === 0 &&
  rings.rings.length === 1 &&
  rings.rings[0] === want;

/**
 * The GL programs the map has compiled, by MapLibre's keys (window.__programs,
 * map-view.tsx), once the warm-up has drawn its twins, or `ms` has passed:
 * `{ keys, warmed, ms }`, `warmed` false when it never came. The lit
 * layers' programs are compiled by the twins while the map is idle, so a tap
 * does not compile them as its card comes up (the cheap-phone plan, step 3,
 * 2026-10-04). The sign is the lit line's program: its opacity varies by
 * feature state (litOpacity), which no layer drawn at rest has, so the key
 * is there from the twins on — a circle program was the sign until the end
 * circles became DOM markers on 2026-10-12, and the twins' own source would
 * not do: the first move takes it away.
 */
export const programsAtRest = async (page, ms = 20000) => {
  const from = Date.now();
  const warmedNow = () =>
    page.evaluate(() =>
      (window.__programs?.() ?? []).some((k) => k.startsWith('line/a_line-opacity/')),
    );
  for (;;) {
    if ((await warmedNow()) || Date.now() - from > ms) break;
    await page.waitForTimeout(200);
  }
  const waited = Date.now() - from;
  // Then the map at rest, its view drawn, before the keys are read: the
  // 'idle' after a frame asked for now. loaded() and areTilesLoaded() alone
  // can be true before the first frame after a jumpTo, which is the frame
  // that asks for the new view's tiles: the keys were then read with nothing
  // of the view drawn, and its basemap's programs counted as the tap's
  // (commuter-test's first tap of a page of its own, 1 run in 4 on
  // Monochrome, 2026-10-15).
  const keys = await page.evaluate(
    () =>
      new Promise((done) => {
        const m = window.__map;
        const read = () => done(window.__programs?.() ?? []);
        const onIdle = () => {
          clearTimeout(timer);
          read();
        };
        const timer = setTimeout(() => {
          m.off('idle', onIdle);
          read();
        }, 10000);
        m.once('idle', onIdle);
        m.triggerRepaint();
      }),
  );
  return { keys, warmed: await warmedNow(), ms: waited };
};

/**
 * Once the map is idle (or 15 s have passed), the GL programs it has
 * compiled since `before` (programsAtRest's keys): `{ added, standIn }`.
 * `standIn` are the ones of them a real basemap compiles as it loads and
 * the suites' stand-in for it, a gray background and nothing else, cannot:
 * a program of one value for the layer (no a_ or z_ in its key) of a fill
 * or a line, while the basemap on the page draws no fill or line of its
 * own. They are the chevrons' and the babaan sides' fill, which Positron's
 * water and parks compile at load. On a real basemap there are none.
 */
export const programsSince = async (page, before) => {
  const { keys, basemap } = await page.evaluate(
    () =>
      new Promise((done) => {
        const m = window.__map;
        const t0 = performance.now();
        const read = () => {
          if (
            !(m.loaded() && m.areTilesLoaded() && !m.isMoving()) &&
            performance.now() - t0 < 15000
          )
            return setTimeout(read, 100);
          const theirs = m
            .getLayersOrder()
            .map((id) => m.getLayer(id))
            .filter((l) => l?.source && m.getSource(l.source)?.type !== 'geojson');
          done({ keys: window.__programs(), basemap: [...new Set(theirs.map((l) => l.type))] });
        };
        setTimeout(read, 300);
      }),
  );
  const family = { fill: 'fill', fillOutline: 'fill', line: 'line' };
  const added = keys.filter((k) => !before.includes(k));
  const standIn = added.filter((k) => {
    const type = family[k.split('/')[0]];
    return !!type && !basemap.includes(type) && !/\/[az]_/.test(k);
  });
  return { added: added.filter((k) => !standIn.includes(k)), standIn };
};
