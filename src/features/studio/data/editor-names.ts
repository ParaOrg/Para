import * as z from 'zod/mini';

import { parsed, readAll } from './read-all';
import { requireSupabase } from './supabase';

const editorNameSchema = z.object({ user_id: z.string(), name: z.string() });

/**
 * Every editor's name by account id (`editor_name`, 0018): readable by
 * editors, filled by the owner by hand. An editor with no row has no entry.
 */
export async function fetchEditorNames(): Promise<Map<string, string>> {
  const client = requireSupabase();
  const data = await readAll((from, to) =>
    client
      .from('editor_name')
      .select('user_id, name', { count: 'exact' })
      .order('user_id', { ascending: true })
      .range(from, to),
  );
  const rows = parsed(editorNameSchema, data, 'editor name');
  return new Map(rows.map((row) => [row.user_id, row.name.trim()]));
}
