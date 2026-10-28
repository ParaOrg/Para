// The publish's guard on a shrunk map (publish-map.mjs), on its own so a unit
// check can hold it (tests/unit/shrink-guard-test.mjs). A map that shrank
// suddenly is far more likely a read that went wrong (a policy change, a
// table made private) than a clear-out, so it is refused unless --force.
//
// Since 0018 an editor takes a route or hotspot down on purpose, and it leaves
// the next file. Those rows are taken out of the count before the share is
// worked out: what was published, less what went on purpose, against what is
// left. Rows gone with no takedown behind them still count, so a table read
// back empty, or a third of it lost, still fails however many takedowns there
// were elsewhere.

const routeIdOf = (v) => v.route_id ?? v.route?.id ?? v.routeId;

/**
 * Why the new map must not be published, one line per collection, or none.
 * `was`, `now`: { variants, stops, links } as published and as just read.
 * `takenDown`: { routes, hotspots }, Sets of ids taken down and not put back.
 */
export function shrinkRefusals({ was, now, takenDown, maxShrink }) {
  if (!was) return [];
  const routes = takenDown?.routes ?? new Set();
  const hotspots = takenDown?.hotspots ?? new Set();
  const wasVariants = Array.isArray(was.variants) ? was.variants : [];
  const goneVariant = new Set(wasVariants.filter((v) => routes.has(routeIdOf(v))).map((v) => v.id));
  const onPurpose = {
    variants: (v) => goneVariant.has(v.id),
    stops: (s) => hotspots.has(s.id),
    links: (l) => goneVariant.has(l.route_variant_id) || hotspots.has(l.stop_id),
  };
  const refusals = [];
  for (const key of ['variants', 'stops', 'links']) {
    const rows = Array.isArray(was[key]) ? was[key] : [];
    const kept = Array.isArray(now[key]) ? now[key] : [];
    const taken = rows.filter(onPurpose[key]).length;
    const before = rows.length - taken;
    const after = kept.length;
    if (before > 0 && after < before * (1 - maxShrink)) {
      refusals.push(
        `${key}: ${rows.length} → ${after} rows` +
          (taken ? ` (${taken} taken down on purpose)` : '') +
          `, more than ${maxShrink * 100}% fewer than the published map. ` +
          'Not publishing. If the removal is deliberate, run with --force.',
      );
    }
  }
  return refusals;
}

/** The takedown rows still in force, as the Sets shrinkRefusals takes. */
export function takenDownSets(rows) {
  const routes = new Set();
  const hotspots = new Set();
  for (const r of rows ?? []) {
    if (r.put_back_at) continue;
    if (r.kind === 'route') routes.add(r.subject_id);
    else if (r.kind === 'hotspot') hotspots.add(r.subject_id);
  }
  return { routes, hotspots };
}
