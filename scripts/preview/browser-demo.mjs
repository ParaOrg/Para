// Standalone, browser-local sample data for the hosted review preview only.
// This function is injected into a separate build; deployed ParaPo never imports it.
export function installReviewDemo(seed, session) {
  const storageKey = 'parapo-isolated-review-v1';
  const nativeFetch = window.fetch.bind(window);
  const fresh = () => structuredClone(seed);
  const load = () => {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey));
      if (
        saved?.version === 1 &&
        ['route', 'route_variant', 'route_stop', 'stop', 'draft'].every((key) =>
          Array.isArray(saved[key]),
        )
      )
        return saved;
    } catch {
      /* A broken sample cache resets to the fixture. */
    }
    return fresh();
  };
  const save = (state) => localStorage.setItem(storageKey, JSON.stringify(state));
  const now = () => new Date().toISOString();
  const response = (data, status = 200, headers = {}) =>
    new Response(status === 204 ? null : JSON.stringify(data), {
      status,
      headers: { 'content-type': 'application/json', ...headers },
    });
  const changeDraft = (draft, fields) =>
    Object.assign(draft, fields, { revision: draft.revision + 1, updated_at: now() });
  const changeSubject = (subject, fields) =>
    Object.assign(subject, fields, {
      revision: subject.revision + 1,
      updated_at: now(),
      ...(fields.status && fields.status !== subject.status ? { status_at: now() } : {}),
    });
  const rpc = (state, name, args) => {
    let draft = state.draft.find((row) => row.id === args.p_draft);
    if (name === 'claim_draft') {
      draft = state.draft.find(
        (row) => row.kind === args.p_kind && row.subject_id === args.p_subject_id,
      );
      if (draft) return { code: 'ok', draft, created: false };
      draft = {
        id: crypto.randomUUID(),
        kind: args.p_kind,
        subject_id: args.p_subject_id,
        is_new: args.p_is_new,
        base_revision: args.p_base_revision,
        payload: args.p_payload,
        note: args.p_note ?? null,
        revision: 1,
        status: 'draft',
        editor_id: session.user.id,
        created_at: now(),
        updated_at: now(),
        submitted_at: null,
      };
      state.draft.push(draft);
      return { code: 'ok', draft, created: true };
    }
    if (name === 'take_down' || name === 'put_back') {
      const table = args.p_kind === 'route' ? state.route : state.stop;
      const subject = table.find((row) => row.id === args.p_subject_id);
      if (!subject) return { code: 'subject_gone' };
      const down = name === 'take_down';
      if (subject.status !== (down ? 'approved' : 'taken_down'))
        return { code: down ? 'not_approved' : 'not_taken_down' };
      if (
        down &&
        args.p_kind === 'hotspot' &&
        state.route.some(
          (route) =>
            route.status === 'approved' &&
            [route.head_stop_id, route.tail_stop_id].includes(subject.id),
        )
      )
        return { code: 'blocked' };
      changeSubject(subject, { status: down ? 'taken_down' : 'approved' });
      return { code: down ? 'taken_down' : 'put_back' };
    }
    if (!draft) return { code: 'no_draft' };
    if (args.p_revision != null && draft.revision !== args.p_revision)
      return { code: 'revision_mismatch', current_revision: draft.revision };
    if (name === 'discard_draft') {
      state.draft = state.draft.filter((row) => row.id !== draft.id);
      return { code: 'discarded' };
    }
    if (name === 'submit_draft') {
      if (draft.status !== 'draft') return { code: 'already_pending' };
      changeDraft(draft, { status: 'pending', submitted_at: now() });
      return { code: 'submitted', draft };
    }
    if (name === 'send_back_draft') {
      if (draft.status !== 'pending') return { code: 'not_pending' };
      changeDraft(draft, { status: 'draft', note: args.p_note, submitted_at: null });
      return { code: 'sent_back', draft };
    }
    const table = draft.kind === 'route' ? state.route : state.stop;
    const subject = table.find((row) => row.id === draft.subject_id);
    if (name === 'refresh_draft_base') {
      if (!subject) return { code: 'subject_gone' };
      if (subject.revision !== args.p_base_revision)
        return { code: 'conflict', current_revision: subject.revision };
      changeDraft(draft, { base_revision: subject.revision, status: 'draft', submitted_at: null });
      return { code: 'ok', draft };
    }
    if (name !== 'approve_reviewed_draft') return { code: 'refused' };
    if (draft.status !== 'pending') return { code: 'not_pending' };
    if (subject && draft.is_new) return { code: 'subject_exists' };
    if (!draft.is_new && (!subject || subject.revision !== draft.base_revision))
      return { code: subject ? 'conflict' : 'subject_gone' };
    const payload = draft.payload;
    if (
      payload.version !== 1 ||
      (draft.kind === 'route' ? !Array.isArray(payload.directions) : !Array.isArray(payload.links))
    )
      return { code: 'bad_payload' };
    if (draft.kind === 'route') {
      const places = [
        payload.route.head_stop_id,
        payload.route.tail_stop_id,
        ...payload.directions.flatMap((direction) => direction.links.map((link) => link.stop_id)),
      ].filter(Boolean);
      if (
        places.some(
          (id) => !state.stop.some((place) => place.id === id && place.status === 'approved'),
        )
      )
        return { code: 'blocked' };
    }
    const target = subject ?? {
      id: draft.subject_id,
      owner_id: session.user.id,
      created_at: now(),
      revision: 0,
      status: 'approved',
      status_at: now(),
    };
    if (!subject) table.push(target);
    changeSubject(target, draft.kind === 'route' ? payload.route : payload.stop);
    if (draft.kind === 'route') {
      const oldIds = state.route_variant
        .filter((direction) => direction.route_id === target.id)
        .map((direction) => direction.id);
      state.route_variant = state.route_variant.filter(
        (direction) => direction.route_id !== target.id,
      );
      state.route_stop = state.route_stop.filter((link) => !oldIds.includes(link.route_variant_id));
      for (const direction of payload.directions) {
        const { links, ...columns } = direction;
        state.route_variant.push({
          ...columns,
          route_id: target.id,
          owner_id: session.user.id,
          created_at: now(),
          updated_at: now(),
        });
        state.route_stop.push(
          ...links.map((link) => ({ ...link, route_variant_id: direction.id })),
        );
      }
      if (payload.directions.every((direction) => !direction.shape))
        changeSubject(target, { status: 'taken_down' });
    } else {
      state.route_stop = state.route_stop.filter((link) => link.stop_id !== target.id);
      state.route_stop.push(...payload.links.map((link) => ({ ...link, stop_id: target.id })));
    }
    state.draft = state.draft.filter((row) => row.id !== draft.id);
    return { code: 'approved' };
  };
  const matches = (row, search) =>
    [...search].every(([key, filter]) => {
      if (['select', 'order', 'limit', 'offset'].includes(key)) return true;
      const value = key.split('.').reduce((item, field) => item?.[field], row);
      if (filter.startsWith('eq.')) return String(value) === filter.slice(3);
      if (filter.startsWith('neq.')) return String(value) !== filter.slice(4);
      if (filter.startsWith('in.(')) return filter.slice(4, -1).split(',').includes(String(value));
      if (filter === 'is.null') return value == null;
      if (filter === 'not.is.null') return value != null;
      return false;
    });
  const b64 = (value) =>
    btoa(JSON.stringify(value)).replaceAll('=', '').replaceAll('+', '-').replaceAll('/', '_');
  session.expires_at = Math.floor(Date.now() / 1000) + 86400;
  session.access_token = `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub: session.user.id, role: 'authenticated', aud: 'authenticated', exp: session.expires_at })}.preview-only`;
  localStorage.setItem('sb-parapo-isolated-preview-auth-token', JSON.stringify(session));
  window.fetch = async (input, init = {}) => {
    const url = new URL(
      typeof input === 'string' || input instanceof URL ? input : input.url,
      location.href,
    );
    const state = load();
    if (url.origin === location.origin && url.pathname === '/data/index.v5.json')
      return response(state.published);
    if (url.origin === location.origin && url.pathname.startsWith('/data/lines/'))
      return response(
        state.publishedLines[url.pathname.split('/').at(-1).replace('.json', '')] ?? null,
      );
    if (url.hostname !== 'parapo-isolated-preview.invalid') return nativeFetch(input, init);
    try {
      if (url.pathname.includes('/auth/'))
        return response(url.pathname.endsWith('/user') ? session.user : session);
      const method = init.method ?? (input instanceof Request ? input.method : 'GET');
      const raw =
        init.body ??
        (input instanceof Request && !['GET', 'HEAD'].includes(method)
          ? await input.clone().text()
          : '');
      const args = raw ? JSON.parse(raw) : {};
      if (url.pathname.includes('/rpc/')) {
        const result = rpc(state, url.pathname.split('/').at(-1), args);
        save(state);
        return response(result);
      }
      const table = url.pathname.split('/').at(-1);
      if (!Array.isArray(state[table]))
        return response({ message: 'This sample feature is unavailable.' }, 404);
      const enriched = state[table].map((row) =>
        table === 'route_variant'
          ? { ...row, route: state.route.find((route) => route.id === row.route_id) }
          : row,
      );
      let rows = enriched.filter((row) => matches(row, url.searchParams));
      if (method === 'PATCH' && table === 'draft') {
        for (const row of rows) {
          const draft = state.draft.find((draft) => draft.id === row.id);
          changeDraft(draft, args);
        }
        rows = state.draft.filter((row) => rows.some((old) => old.id === row.id));
        save(state);
      } else if (!['GET', 'HEAD'].includes(method))
        return response(
          { message: 'Only reviewed draft writes are supported in this sample.' },
          400,
        );
      const total = rows.length;
      for (const order of (url.searchParams.get('order') ?? '').split(',').reverse()) {
        const [key, direction] = order.split('.');
        if (key)
          rows.sort(
            (a, b) =>
              String(a[key] ?? '').localeCompare(String(b[key] ?? '')) *
              (direction === 'desc' ? -1 : 1),
          );
      }
      const offset = Number(url.searchParams.get('offset') ?? 0),
        limit = Number(url.searchParams.get('limit') ?? 1000);
      rows = rows.slice(offset, offset + limit);
      const headers = new Headers(init.headers ?? (input instanceof Request ? input.headers : {}));
      const single = headers.get('accept')?.includes('vnd.pgrst.object');
      return response(method === 'HEAD' ? null : single ? (rows[0] ?? null) : rows, 200, {
        'content-range': `${offset}-${offset + rows.length - 1}/${total}`,
      });
    } catch (error) {
      return response({ message: `Sample preview: ${error.message}` }, 400);
    }
  };
  window.paraPoReviewDemo = {
    reset() {
      localStorage.removeItem(storageKey);
      location.reload();
    },
    publish() {
      const state = load();
      const routes = state.route.filter((route) => route.status === 'approved');
      const stops = state.stop.filter((stop) => stop.status === 'approved');
      const variants = state.route_variant.filter((direction) =>
        routes.some((route) => route.id === direction.route_id),
      );
      state.published = {
        schema: 5,
        source_revisions: {
          routes: Object.fromEntries(routes.map((row) => [row.id, row.revision])),
          hotspots: Object.fromEntries(stops.map((row) => [row.id, row.revision])),
        },
        published_at: now(),
        license: 'ODbL-1.0',
        attribution: seed.published.attribution,
        variants: variants.map((direction) => {
          const route = routes.find((route) => route.id === direction.route_id);
          const head =
            stops.find((stop) => stop.id === route.head_stop_id)?.informal ||
            stops.find((stop) => stop.id === route.head_stop_id)?.name ||
            'Start';
          const tail =
            stops.find((stop) => stop.id === route.tail_stop_id)?.informal ||
            stops.find((stop) => stop.id === route.tail_stop_id)?.name ||
            'End';
          const name = route.is_loop ? route.signboard || 'Loop' : `${head} – ${tail}`;
          const facts = {
            id: route.id,
            name,
            signboard: route.signboard,
            long_name: null,
            mode: route.mode,
            fare_note: route.fare_note,
            head_stop_id: route.head_stop_id,
            tail_stop_id: route.tail_stop_id,
            via: route.via,
            ...(route.is_loop ? { is_loop: true } : {}),
            ...(route.route_code ? { route_code: route.route_code } : {}),
          };
          return {
            id: direction.id,
            route_id: route.id,
            direction_name: direction.direction_name || name,
            origin_terminal: direction.origin_terminal ?? null,
            destination_terminal: direction.destination_terminal ?? null,
            reversed: direction.reversed,
            confidence: direction.confidence ?? 'drawn',
            overview: direction.overview ?? direction.shape,
            signboards: direction.signboards ?? [],
            route: facts,
          };
        }),
        stops: stops.map(
          ({ id, name, informal, aliases, kind, area, point, note, created_at, line }) => ({
            id,
            name,
            informal,
            aliases,
            kind,
            area,
            point,
            note,
            created_at,
            line,
          }),
        ),
        links: state.route_stop.filter(
          (link) =>
            variants.some((direction) => direction.id === link.route_variant_id) &&
            stops.some((stop) => stop.id === link.stop_id),
        ),
      };
      state.publishedLines = Object.fromEntries(
        variants.map((direction) => [
          direction.id,
          { schema: 1, id: direction.id, shape: direction.shape },
        ]),
      );
      save(state);
      window.dispatchEvent(new Event('parapo-sample-published'));
    },
  };
}
