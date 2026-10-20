import {
  FERRY_LINES,
  FERRY_MODES,
  LINE_MODES,
  LINES,
} from '../../src/features/routes/model/routes.ts';

/** Shape 3's leave-out: the ferry (0012), which an app reading shape 3 would take for a jeep. */
export const FERRY = { modes: FERRY_MODES, lines: FERRY_LINES };
/** Shapes 1 and 2's: every line, the trains (0011) and the ferry. */
export const EVERY_LINE = { modes: LINE_MODES, lines: LINES };

/**
 * The map with some lines left out: every direction of their modes, every
 * station of theirs (a stop whose `line` is one of them), every direction of
 * a route that ends at one of those stations (a jeep to an LRT-2 station: the
 * app would find no hotspot for its end), and every link to any of them —
 * for the shapes an app installed before them reads
 * (src/features/routes/published/map-file.ts). Such an app does not know their mode is a
 * line's: it would draw a jeep stopping at one of their stations, and their
 * route at every jeep hintuan along its track or river. Shape 4 has them
 * all; shape 3 every line but the ferry; shapes 1 and 2 none. The owner's
 * pick of 2026-10-03, after the nightly publish from the old script put the
 * trains out half-made.
 *
 * `ids` are what was left out.
 */
export function withoutLines({ variants, stops, links }, { modes, lines }) {
  const hotspotIds = new Set(
    stops.filter((s) => s.line && lines.includes(s.line)).map((s) => s.id),
  );
  const endsAtLeftOut = (route) =>
    hotspotIds.has(route?.head_stop_id) || hotspotIds.has(route?.tail_stop_id);
  const directionIds = new Set(
    variants
      .filter((v) => modes.includes(v.route?.mode) || endsAtLeftOut(v.route))
      .map((v) => v.id),
  );
  return {
    variants: variants.filter((v) => !directionIds.has(v.id)),
    stops: stops.filter((s) => !hotspotIds.has(s.id)),
    links: links.filter((l) => !directionIds.has(l.route_variant_id) && !hotspotIds.has(l.stop_id)),
    ids: { variants: directionIds, stops: hotspotIds },
  };
}
