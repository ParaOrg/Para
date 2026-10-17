// A stand-in for the Supabase client the studio writes with, for checks that
// need to see which requests a save sends and what it does when one is
// refused. Every query is recorded as { table, op, payload, filters, select,
// options, upsertOptions } and answered by `answer(query)`, which returns
// { data, error } (plus `count` for a head count). Only the builder calls the
// studio uses are here; anything else fails loudly. Since 2026-10-03.
export function fakeSupabase(answer) {
  const log = [];
  // The storage calls the studio makes, recorded as { bucket, op: 'upload' |
  // 'remove', path (upload) or paths (remove), body, options }; `uploaded`
  // answers an upload, `{ error }` refusing it.
  const storage = {
    calls: [],
    uploaded: () => ({ error: null }),
    removed: () => ({ error: null }),
  };
  const from = (table) => {
    const q = {
      table,
      op: 'select',
      payload: undefined,
      filters: [],
      select: undefined,
      options: undefined,
      upsertOptions: undefined,
    };
    const builder = {
      insert(payload) {
        q.op = 'insert';
        q.payload = payload;
        return builder;
      },
      update(payload) {
        q.op = 'update';
        q.payload = payload;
        return builder;
      },
      upsert(payload, options) {
        q.op = 'upsert';
        q.payload = payload;
        q.upsertOptions = options;
        return builder;
      },
      delete() {
        q.op = 'delete';
        return builder;
      },
      select(columns, options) {
        q.select = columns ?? '*';
        q.options = options;
        return builder;
      },
      eq(col, val) {
        q.filters.push(['eq', col, val]);
        return builder;
      },
      neq(col, val) {
        q.filters.push(['neq', col, val]);
        return builder;
      },
      in(col, val) {
        q.filters.push(['in', col, val]);
        return builder;
      },
      is(col, val) {
        q.filters.push(['is', col, val]);
        return builder;
      },
      not(col, op, val) {
        q.filters.push(['not', col, op, val]);
        return builder;
      },
      order() {
        return builder;
      },
      range() {
        return builder;
      },
      single() {
        q.single = true;
        return builder;
      },
      maybeSingle() {
        q.maybeSingle = true;
        return builder;
      },
      then(resolve, reject) {
        log.push(q);
        return Promise.resolve()
          .then(() => answer(q))
          .then((r) => ({ data: null, error: null, ...r }))
          .then(resolve, reject);
      },
    };
    return builder;
  };
  const bucket = (name) => ({
    async upload(path, body, options) {
      storage.calls.push({ bucket: name, op: 'upload', path, body, options });
      return storage.uploaded(path);
    },
    async remove(paths) {
      storage.calls.push({ bucket: name, op: 'remove', paths });
      return storage.removed(paths);
    },
  });
  return { client: { from, storage: { from: bucket } }, log, storage };
}
