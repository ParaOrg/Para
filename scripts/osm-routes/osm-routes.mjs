// Builds the studio's OSM route files (osm-route-file.mjs) from the extract's route relations,
// which build.sh writes as OPL with osmium, and fails on a file not to trust. The directory is
// rewritten whole, so a relation gone from OSM leaves no file behind. With --compare, prints the
// kinds' counts before and after, for the monthly refresh's pull request.
//
//   node scripts/osm-routes/osm-routes.mjs --filter
//   node scripts/osm-routes/osm-routes.mjs <routes.opl> <extract timestamp> <out dir>
//   node scripts/osm-routes/osm-routes.mjs --compare <before index.json> <after index.json>
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { readPanningBox } from '../tiles/area.mjs';
import {
  OSM_ROUTE_FILTER,
  osmRouteCountsTable,
  osmRouteIndexProblems,
  osmRouteIndexText,
  osmRouteProblems,
  osmRoutesFrom,
  osmRouteText,
  readOpl,
  routeFileName,
} from './osm-route-file.mjs';

const [first, second, third] = process.argv.slice(2);

if (first === '--filter') {
  console.log(OSM_ROUTE_FILTER.join(' '));
} else if (first === '--compare') {
  const read = (path) => (path && existsSync(path) ? readFileSync(path, 'utf8') : '');
  console.log(osmRouteCountsTable(read(second), read(third)));
} else if (first && second && third) {
  const opl = readOpl(readFileSync(first, 'utf8').split('\n'));
  const routes = osmRoutesFrom(opl, readPanningBox());
  const index = osmRouteIndexText({ extractAt: second, routes });
  const problems = osmRouteIndexProblems(index).map((p) => `index.json: ${p}`);
  const files = routes.map((route) => [
    routeFileName(route.id),
    osmRouteText({ extractAt: second, route }),
  ]);
  for (const [name, text] of files)
    problems.push(...osmRouteProblems(text).map((p) => `${name}: ${p}`));
  for (const problem of problems) console.error(`${third}/${problem}`);
  if (problems.length > 0) process.exit(1);
  mkdirSync(third, { recursive: true });
  for (const name of readdirSync(third)) if (/^r\d+\.json$/.test(name)) rmSync(join(third, name));
  writeFileSync(join(third, 'index.json'), index);
  for (const [name, text] of files) writeFileSync(join(third, name), text);
  const count = (kind) => routes.filter((route) => route.kind === kind).length;
  const bytes = files.reduce((sum, [, text]) => sum + text.length, 0);
  console.error(
    `Wrote ${routes.length} OSM routes to ${third}: jeepney ${count('jeepney')}, UV ${count('uv')}, ` +
      `bus ${count('bus')}, rail ${count('rail')}; index ${Math.round(index.length / 1024)} kB, ` +
      `routes ${Math.round(bytes / 1024)} kB.`,
  );
} else {
  console.error(
    'Usage: node scripts/osm-routes/osm-routes.mjs <routes.opl> <extract timestamp> <out dir>',
  );
  process.exit(2);
}
