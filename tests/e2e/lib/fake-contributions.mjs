// The contributor page's slice of Supabase, in memory, for the browser suites:
// an anonymous sign-in, save_contribution and a phone deleting its own
// contribution, answered as GoTrue and PostgREST answer. Every request to
// *.supabase.co lands here, so no suite ever reaches the live project; one this
// stand-in does not know is answered 501 and counted in `unknown`.
//
// Faults, set on `fake.next` before the request they are for:
//   offline       the save request fails as with no signal
//   lostAnswer    the save is stored, then the answer is lost on the way back
//   hold          the save waits until `fake.release()` (an upload in flight)
//   refuse        the save is refused: 'bad_points' (never taken) or 'day_cap'
//   removeOffline the delete fails as with no signal

const json = (route, status, body) =>
  route.fulfill({
    status,
    contentType: 'application/json',
    headers: { 'access-control-allow-origin': '*' },
    body: JSON.stringify(body),
  });

const session = (userId) => ({
  access_token: `fake-${userId}`,
  token_type: 'bearer',
  expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  refresh_token: `refresh-${userId}`,
  user: {
    id: userId,
    aud: 'authenticated',
    role: 'authenticated',
    is_anonymous: true,
    app_metadata: {},
    user_metadata: {},
    created_at: new Date().toISOString(),
  },
});

/** Routes `page`'s Supabase requests to a fresh stand-in. Register after any other https route. */
export async function fakeContributions(page) {
  const fake = {
    /** The contributions stored, by id, each with the phone that sent it. */
    rows: new Map(),
    signIns: 0,
    saveRequests: 0,
    deleteRequests: 0,
    unknown: [],
    captchaTokens: [],
    next: {},
    held: null,
    release() {
      this.held?.();
      this.held = null;
    },
  };

  const userOf = (request) => {
    const auth = request.headers()['authorization'] ?? '';
    const match = /^Bearer fake-(.+)$/.exec(auth);
    return match ? match[1] : null;
  };

  await page.route(/^https:\/\/[^/]+\.supabase\.co\//, async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const method = request.method();
    if (method === 'OPTIONS') {
      return route.fulfill({
        status: 204,
        headers: {
          'access-control-allow-origin': '*',
          'access-control-allow-headers': '*',
          'access-control-allow-methods': '*',
        },
      });
    }

    if (url.pathname === '/auth/v1/signup' && method === 'POST') {
      fake.signIns += 1;
      const body = request.postDataJSON() ?? {};
      fake.captchaTokens.push(body.gotrue_meta_security?.captcha_token ?? null);
      return json(route, 200, session(crypto.randomUUID()));
    }
    if (url.pathname === '/auth/v1/user' && method === 'GET') {
      const user = userOf(request);
      return user ? json(route, 200, session(user).user) : json(route, 401, { msg: 'no session' });
    }

    if (url.pathname === '/rest/v1/rpc/save_contribution' && method === 'POST') {
      fake.saveRequests += 1;
      const user = userOf(request);
      if (!user) return json(route, 401, { code: '42501', message: 'not_signed_in' });
      const fault = fake.next.save;
      delete fake.next.save;
      if (fault === 'offline') return route.abort('internetdisconnected');
      if (fault === 'hold') await new Promise((resolve) => (fake.held = resolve));
      if (fault === 'bad_points' || fault === 'day_cap') {
        const message =
          fault === 'day_cap'
            ? 'day_cap: 20 contributions in 24 hours'
            : 'bad_points: point 2 is faster than 150 km/h';
        return json(route, 400, { code: 'P0001', message, details: null, hint: null });
      }
      const recording = request.postDataJSON().recording;
      const existing = fake.rows.get(recording.id);
      if (existing && existing.by !== user) {
        return json(route, 400, { code: 'P0001', message: 'id_taken', details: null, hint: null });
      }
      if (!existing) fake.rows.set(recording.id, { by: user, recording });
      if (fault === 'lostAnswer') return route.abort('connectionreset');
      return json(route, 200, existing ? 'already saved' : 'saved');
    }

    if (url.pathname === '/rest/v1/contribution' && method === 'DELETE') {
      fake.deleteRequests += 1;
      const user = userOf(request);
      const fault = fake.next.remove;
      delete fake.next.remove;
      if (fault === 'removeOffline') return route.abort('internetdisconnected');
      const id = /^eq\.(.+)$/.exec(url.searchParams.get('id') ?? '')?.[1];
      // Row security: a phone deletes only its own; anyone else's is silently not there.
      if (id && fake.rows.get(id)?.by === user) fake.rows.delete(id);
      return route.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*' } });
    }

    fake.unknown.push(`${method} ${url.pathname}`);
    return json(route, 501, { message: 'not in the stand-in' });
  });
  return fake;
}
