// The database's stand-in for the studio's reads of its route tables: route, route_variant,
// route_stop and stop, answered from fixtures/route-tables.mjs (built from the published map) the
// way PostgREST answers them. It is strict: a table, a column, a filter, an order, a header or a
// method it does not know is refused and named, never answered as if it were understood. A write
// is refused the same way. lib/stand-ins.mjs applies it to the database's own address.
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { buildRouteTables } from '../fixtures/route-tables.mjs';

const ROOT = fileURLToPath(new URL('../../../', import.meta.url));

/**
 * The database address the dev server's build reads: .env.local's VITE_SUPABASE_URL (CI copies
 * .env.production there), else .env's; null when neither names one, so nothing is stood in.
 */
export const databaseUrl = () => {
  for (const file of ['.env.local', '.env']) {
    const path = `${ROOT}${file}`;
    if (!existsSync(path)) continue;
    const line = readFileSync(path, 'utf8')
      .split('\n')
      .find((l) => l.startsWith('VITE_SUPABASE_URL='));
    if (line) return line.slice('VITE_SUPABASE_URL='.length).trim().replace(/\/$/, '');
  }
  return null;
};

/** Each table's columns as the live schema has them (src/shared/types/database.types.ts). */
const liveColumns = (() => {
  const types = readFileSync(`${ROOT}src/shared/types/database.types.ts`, 'utf8');
  const columns = {};
  for (const table of ['route', 'route_variant', 'route_stop', 'stop']) {
    const row = new RegExp(`\\n\\s+${table}: \\{\\s*Row: \\{(.*?)\\n\\s+\\}`, 's').exec(types);
    if (!row) throw new Error(`database.types.ts has no Row for ${table}`);
    columns[table] = new Set([...row[1].matchAll(/\n\s+(\w+)\??:/g)].map((m) => m[1]));
  }
  return columns;
})();

let tables = null;
/** The rows, built once a run, on the first request. */
const rows = () => (tables ??= buildRouteTables());

/** A refusal, with the reason the stand-in gives for it. */
class Refused extends Error {}
const refuse = (why) => {
  throw new Refused(why);
};

const knownColumn = (table, column) => {
  if (!liveColumns[table].has(column)) refuse(`${table} has no column ${column}`);
  if (!rows()[table].some((r) => column in r)) refuse(`the stand-in's ${table} has no ${column}`);
};

/** Split a select on its top-level commas: `id,route:route(*)`. */
const splitTop = (select) => {
  const items = [];
  let depth = 0;
  let item = '';
  for (const ch of select) {
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (ch === ',' && depth === 0) {
      items.push(item);
      item = '';
    } else item += ch;
  }
  if (item) items.push(item);
  return items;
};

/** A row as `select` asks for it: `*`, columns, or the one embed the studio uses. */
const shaped = (table, row, select) => {
  if (select === '*') return { ...row };
  const out = {};
  for (const item of splitTop(select)) {
    const embed = /^(?:(\w+):)?(\w+)\((.*)\)$/.exec(item);
    if (!embed) {
      knownColumn(table, item);
      out[item] = row[item];
      continue;
    }
    const [, alias, relation, inner] = embed;
    if (table !== 'route_variant' || relation !== 'route' || inner !== '*') {
      refuse(`the embed ${item} on ${table}`);
    }
    out[alias ?? relation] = { ...rows().route.find((r) => r.id === row.route_id) };
  }
  return out;
};

const isNull = (value) => value === null || value === undefined;

const filtered = (table, list, filters) =>
  list.filter((row) =>
    filters.every(([column, value]) => {
      knownColumn(table, column);
      if (value === 'is.null') return isNull(row[column]);
      if (value === 'not.is.null') return !isNull(row[column]);
      if (value.startsWith('eq.')) return String(row[column]) === value.slice(3);
      return refuse(`the filter ${column}=${value}`);
    }),
  );

/** Sorted as PostgREST sorts: ascending puts nulls last, descending first, unless told. */
const sorted = (table, list, order) => {
  const keys = order.split(',').map((key) => {
    const [column, direction = 'asc', nulls, ...rest] = key.split('.');
    knownColumn(table, column);
    if (!['asc', 'desc'].includes(direction) || rest.length > 0) refuse(`the order ${key}`);
    if (nulls !== undefined && !['nullsfirst', 'nullslast'].includes(nulls)) {
      refuse(`the order ${key}`);
    }
    return {
      column,
      sign: direction === 'desc' ? -1 : 1,
      nullsFirst: nulls ? nulls === 'nullsfirst' : direction === 'desc',
    };
  });
  return [...list].sort((a, b) => {
    for (const { column, sign, nullsFirst } of keys) {
      const [x, y] = [a[column], b[column]];
      if (isNull(x) || isNull(y)) {
        if (isNull(x) && isNull(y)) continue;
        return isNull(x) === nullsFirst ? -1 : 1;
      }
      if (x !== y) return (x < y ? -1 : 1) * sign;
    }
    return 0;
  });
};

const READ_PARAMS = new Set(['select', 'order', 'offset', 'limit']);
const ONE_ROW = 'application/vnd.pgrst.object+json';

/** The answer PostgREST would give, or a Refused naming what the stand-in does not know. */
const answer = (request) => {
  const url = new URL(request.url());
  if (request.method() !== 'GET') refuse(`${request.method()}: only reads are stood in`);
  const table = /^\/rest\/v1\/(\w+)$/.exec(url.pathname)?.[1];
  if (!table || !(table in liveColumns)) refuse(`the path ${url.pathname}`);
  const headers = request.headers();
  // The studio pages through a table with its total count (data/read-all.ts): the one Prefer known.
  const isCounted = headers.prefer === 'count=exact';
  if (headers.prefer && !isCounted) refuse(`Prefer: ${headers.prefer}`);
  if (headers.range) refuse(`Range: ${headers.range}`);
  const accept = headers.accept ?? 'application/json';
  const isOneRow = accept.includes(ONE_ROW);
  if (!isOneRow && !accept.includes('application/json') && accept !== '*/*') {
    refuse(`Accept: ${accept}`);
  }
  const params = [...url.searchParams];
  const param = (name) => params.find(([key]) => key === name)?.[1];
  const filters = params.filter(([key]) => !READ_PARAMS.has(key));
  const offset = Number(param('offset') ?? 0);
  const limit = param('limit') === undefined ? Infinity : Number(param('limit'));
  if (!Number.isInteger(offset) || offset < 0 || !(limit === Infinity || Number.isInteger(limit))) {
    refuse(`offset ${param('offset')}, limit ${param('limit')}`);
  }
  let list = filtered(table, rows()[table], filters);
  const total = isCounted ? String(list.length) : '*';
  if (param('order') !== undefined) list = sorted(table, list, param('order'));
  list = list
    .slice(offset, offset + limit)
    .map((row) => shaped(table, row, param('select') ?? '*'));
  const range = list.length ? `${offset}-${offset + list.length - 1}/${total}` : `*/${total}`;
  if (isOneRow) {
    if (list.length !== 1) {
      return {
        status: 406,
        headers: { 'content-range': range },
        json: { code: 'PGRST116', message: `${list.length} rows` },
      };
    }
    return { status: 200, headers: { 'content-range': range }, json: list[0] };
  }
  return { status: 200, headers: { 'content-range': range }, json: list };
};

/**
 * A route handler for the database's /rest/v1/: answers the route tables' reads, and refuses
 * anything else with a 500, adding it to `refused` so the suite fails naming it.
 */
export const answerRouteTables = (refused) => (route) => {
  const request = route.request();
  try {
    const { status, headers, json } = answer(request);
    return route.fulfill({ status, headers, json });
  } catch (error) {
    if (!(error instanceof Refused)) throw error;
    const url = new URL(request.url());
    refused.add(`${request.method()} ${url.pathname}${url.search}: ${error.message}`);
    return route.fulfill({
      status: 500,
      json: { message: `the stand-in refuses: ${error.message}` },
    });
  }
};
