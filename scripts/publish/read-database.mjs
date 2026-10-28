// Reads the public tables over Supabase's REST API with the publishable key
// (from .env.production, or SUPABASE_URL / SUPABASE_PUBLISHABLE_KEY in the
// environment), exactly the columns the public map shows: no owner ids, no
// control points, no segments. And the signboards from the public bucket,
// cleaned again before they land on the map's own domain.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { cleanSignboardSvg } from '../../src/features/routes/model/signboard-svg.ts';
import { privacyLeaks } from './privacy-probe.mjs';

/** PostgREST answers at most this many rows per request; ask page by page. */
const PAGE = 1000;
const TIMEOUT_MS = 30_000;

/** KEY=value lines; a quoted value keeps what is inside the quotes; # starts a comment. */
function readEnvFile(path) {
  const out = {};
  if (!existsSync(path)) return out;
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^#]*?))\s*(?:#.*)?$/.exec(line);
    if (m) out[m[1]] = m[2] ?? m[3] ?? m[4] ?? '';
  }
  return out;
}

/** The database's address and the publishable key, or null when either is missing. */
export function databaseConfig(root) {
  const envFile = readEnvFile(join(root, '.env.production'));
  const url = process.env.SUPABASE_URL ?? envFile.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY ?? envFile.VITE_SUPABASE_PUBLISHABLE_KEY;
  return url && key ? { url, key } : null;
}

/** The reads the publish makes, against one database. */
export function databaseReader({ url, key }) {
  /** One page of a table, with a timeout and one retry: a hung connection must not hold the daily job. */
  async function page(path, from) {
    const attempt = async () => {
      const res = await fetch(`${url}/rest/v1/${path}`, {
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
          Range: `${from}-${from + PAGE - 1}`,
        },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (!res.ok && res.status !== 206)
        throw new Error(`${path.split('?')[0]}: HTTP ${res.status} ${await res.text()}`);
      return res.json();
    };
    try {
      return await attempt();
    } catch (e) {
      if (e instanceof Error && /HTTP 4\d\d/.test(e.message)) throw e;
      return attempt();
    }
  }

  /** Every row of a table, however many. */
  async function rest(path) {
    const rows = [];
    for (let from = 0; ; from += PAGE) {
      const chunk = await page(path, from);
      rows.push(...chunk);
      if (chunk.length < PAGE) return rows;
    }
  }

  return {
    // Approved rows only: since 0018 the read rules give the publishable key
    // approved routes, hotspots, their directions and links, and nothing taken
    // down, so these queries never name a status. Before 0018 every row is.
    // Rows ordered by id, not by when they were saved: re-saving a direction with
    // the same geometry must not reorder the file and commit a change nobody can
    // see. (The map draws them in file order, which nothing depends on.)
    async tables() {
      const [directionRows, hotspotRows, linkRows] = await Promise.all([
        rest(
          'route_variant?select=id,route_id,direction_name,origin_terminal,destination_terminal,shape,confidence,reversed,signboards,' +
            'route:route(id,revision,signboard,route_code,long_name,mode,fare_note,head_stop_id,tail_stop_id,via,is_loop)&order=id.asc',
        ),
        rest(
          'stop?select=id,revision,name,informal,aliases,kind,point,area,note,created_at,line&order=id.asc',
        ),
        rest(
          'route_stop?select=route_variant_id,stop_id,stop_sequence&order=route_variant_id.asc,stop_sequence.asc,stop_id.asc',
        ),
      ]);
      return { directionRows, hotspotRows, linkRows };
    },

    // No contributor or editor-only row is readable with the key the files are
    // built from: checked before anything is written (privacy-probe.mjs).
    leaks() {
      return privacyLeaks(async (table) => {
        const res = await fetch(`${url}/rest/v1/${table}?select=*&limit=1`, {
          headers: { apikey: key, Authorization: `Bearer ${key}` },
          signal: AbortSignal.timeout(TIMEOUT_MS),
        });
        const text = await res.text();
        let body = null;
        try {
          body = JSON.parse(text);
        } catch {
          // Not JSON: the status decides.
        }
        return { status: res.status, body };
      });
    },

    // What editors took down and haven't put back (0018), for the shrink guard.
    // Before 0018 there is no such table, and nothing is taken out of the count.
    async takedowns() {
      try {
        return await rest(
          'takedown?select=kind,subject_id,taken_down_at,put_back_at&put_back_at=is.null',
        );
      } catch (e) {
        if (!(e instanceof Error && /HTTP 404|PGRST205|42P01/.test(e.message))) throw e;
        return [];
      }
    },

    /**
     * A signboard from the bucket, cleaned again before it lands on the map's own
     * domain (features/routes/model/signboard-svg.ts): null when it is gone from the bucket,
     * `{ refused }` when the clean says no. The bucket keeps whatever an editor's
     * session sent (the studio's own clean runs in the browser), so a refused
     * board is left out and said, never published, and never stops the map.
     */
    async board(name) {
      const attempt = async () => {
        const res = await fetch(`${url}/storage/v1/object/public/signboards/${name}`, {
          signal: AbortSignal.timeout(TIMEOUT_MS),
        });
        if (res.status === 400 || res.status === 404) return null;
        if (!res.ok) throw new Error(`signboards/${name}: HTTP ${res.status}`);
        return res.text();
      };
      const text = await attempt().catch(attempt);
      if (text === null) return null;
      const clean = cleanSignboardSvg(text);
      if ('error' in clean) return { refused: clean.error };
      return clean.svg + '\n';
    },
  };
}
