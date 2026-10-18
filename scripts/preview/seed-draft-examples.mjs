// Add review examples only to the disposable preview database after seeding.
import { readFileSync } from 'node:fs';
import { PREVIEW_USER_ID } from './review-fixture.mjs';
const index = JSON.parse(readFileSync('public/data/index.v5.json', 'utf8'));
const routes = [
  ...new Map(index.variants.map((direction) => [direction.route.id, direction.route])).values(),
];
const quote = (value) => `'${String(value).replaceAll("'", "''")}'`;
const json = (value) => `${quote(JSON.stringify(value))}::jsonb`;
const payload = (route) => ({
  version: 1,
  route: {
    signboard: `${route.signboard ?? 'Route'} · Preview`,
    mode: route.mode,
    fare_note: 'Preview change for review',
    via: route.via ?? null,
    head_stop_id: route.head_stop_id,
    tail_stop_id: route.tail_stop_id,
    is_loop: route.is_loop ?? false,
  },
  directions: index.variants
    .filter((direction) => direction.route_id === route.id)
    .map((direction) => {
      const { shape } = JSON.parse(readFileSync(`public/data/lines/${direction.id}.json`, 'utf8'));
      return {
        id: direction.id,
        reversed: direction.reversed,
        control_points: shape?.coordinates ?? [],
        segments: shape ? [{ mode: 'freehand', coordinates: shape.coordinates }] : [],
        shape,
        overview: direction.overview ?? shape,
        confidence: direction.confidence,
        signboards: direction.signboards ?? [],
        links: index.links
          .filter((link) => link.route_variant_id === direction.id)
          .map(({ stop_id, stop_sequence }) => ({ stop_id, stop_sequence })),
      };
    }),
});
console.log(
  `begin; set role authenticated; select set_config('request.jwt.claim.sub', '${PREVIEW_USER_ID}', true);`,
);
for (const [at, route] of routes.slice(0, 2).entries()) {
  console.log(
    `select public.claim_draft('route', ${quote(route.id)}, false, (select revision from public.route where id=${quote(route.id)}), ${json(payload(route))});`,
  );
  console.log(
    `select public.submit_draft(id, revision) from public.draft where subject_id=${quote(route.id)};`,
  );
  if (at === 1)
    console.log(
      `update public.route set fare_note='Another editor changed approved data' where id=${quote(route.id)};`,
    );
}
const stop = {
  name: 'Preview new place',
  informal: null,
  aliases: [],
  kind: 'hintuan',
  note: 'A draft-only place to inspect',
  line: null,
  area: {
    type: 'Polygon',
    coordinates: [
      [
        [121.064, 14.653],
        [121.065, 14.653],
        [121.065, 14.654],
        [121.064, 14.654],
        [121.064, 14.653],
      ],
    ],
  },
  point: { type: 'Point', coordinates: [121.0645, 14.6535] },
};
console.log(
  `select public.claim_draft('hotspot', '10000000-0000-4000-8000-000000000001', true, null, ${json({ version: 1, stop, links: [] })});`,
);
console.log(`select public.take_down('route', ${quote(routes[3].id)}); commit;`);
