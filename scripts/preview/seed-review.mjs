// Fixture data only. Pipe into the disposable parapo_preview database.
import { readFileSync } from 'node:fs';
const index = JSON.parse(readFileSync('public/data/index.v5.json', 'utf8'));
const owner = '00000000-0000-0000-0000-0000000000e1';
const quote = (value) => `'${String(value).replaceAll("'", "''")}'`;
const json = (value) => `${quote(JSON.stringify(value))}::jsonb`;
const value = (item) =>
  item == null
    ? 'null'
    : typeof item === 'object'
      ? json(item)
      : typeof item === 'boolean' || typeof item === 'number'
        ? String(item)
        : quote(item);
const insert = (table, row) =>
  `insert into public.${table} (${Object.keys(row).join(',')}) values (${Object.values(row).map(value).join(',')});`;
const routes = [
  ...new Map(index.variants.map((direction) => [direction.route.id, direction.route])).values(),
];
const sql = [
  'begin;',
  'truncate public.draft, public.takedown, public.route_stop, public.route_variant, public.route, public.stop cascade;',
  `select set_config('request.jwt.claim.sub', '${owner}', true);`,
];
for (const stop of index.stops) {
  const { id, name, informal = null, kind, note = null, line = null } = stop;
  sql.push(
    insert('stop', {
      id,
      owner_id: owner,
      name,
      informal,
      kind,
      note,
      line,
      point: stop.point,
      area: stop.area,
    }).replace(/;$/, '') + ' returning id;',
  );
  sql.push(
    `update public.stop set aliases = array(select jsonb_array_elements_text(${json(stop.aliases ?? [])})), area = ${json(stop.area ?? null)}, point = ${json(stop.point ?? null)} where id = ${quote(id)};`,
  );
}
for (const route of routes)
  sql.push(
    insert('route', {
      id: route.id,
      owner_id: owner,
      signboard: route.signboard ?? null,
      mode: route.mode,
      fare_note: route.fare_note ?? null,
      via: route.via ?? null,
      head_stop_id: route.head_stop_id,
      tail_stop_id: route.tail_stop_id,
      is_loop: route.is_loop ?? false,
      route_code: route.route_code ?? null,
    }),
  );
for (const direction of index.variants) {
  const line = JSON.parse(readFileSync(`public/data/lines/${direction.id}.json`, 'utf8'));
  sql.push(
    `insert into public.route_variant (id, route_id, owner_id, reversed, confidence, shape, overview, control_points, segments, signboards) values (${quote(direction.id)}, ${quote(direction.route_id)}, ${quote(owner)}, ${direction.reversed}, ${quote(direction.confidence)}, ${json(line.shape)}, ${json(direction.overview ?? line.shape)}, ${json(line.shape?.coordinates ?? [])}, ${json(line.shape ? [{ mode: 'freehand', coordinates: line.shape.coordinates }] : [])}, array(select jsonb_array_elements_text(${json(direction.signboards ?? [])})));`,
  );
}
for (const link of index.links) sql.push(insert('route_stop', link));
sql.push('commit;');
console.log(sql.join('\n'));
