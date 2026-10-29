// A signed-in editor for the studio's headless suites: the session the page
// stores for itself and the answers GoTrue gives for it, so /studio/ opens as
// an editor without an account. Used by studio-contributors-test and
// studio-scale-test; lib/save-studio.mjs keeps its own, older copy.

/** The project ref in VITE_SUPABASE_URL, which names the storage key. */
const PROJECT_REF = 'smzwbqxttdyvohuizynl';
const EDITOR_ID = '11111111-1111-4111-8111-111111111111';

const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');

const make = (id, email) => {
  const now = new Date().toISOString();
  const exp = Math.floor(Date.now() / 1000) + 6 * 3600;
  const user = {
    id,
    aud: 'authenticated',
    role: 'authenticated',
    email,
    app_metadata: { provider: 'email' },
    user_metadata: {},
    created_at: now,
    updated_at: now,
  };
  const claims = {
    sub: id,
    aud: 'authenticated',
    role: 'authenticated',
    exp,
    iat: exp - 3600,
  };
  const jwt = `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64(claims)}.standin`;
  return {
    user,
    session: {
      access_token: jwt,
      refresh_token: 'standin',
      token_type: 'bearer',
      expires_in: 6 * 3600,
      expires_at: exp,
      user,
    },
  };
};

/**
 * Makes `page` an editor: the stored session, GoTrue's answers, and the test hook `window.__src`.
 * Two pages signed in with different ids are two editors.
 */
export async function signInAsEditor(page, { id = EDITOR_ID, email = 'editor@example.com' } = {}) {
  const { user, session } = make(id, email);
  await page.route(/\/auth\/v1\/user/, (r) =>
    r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(user) }),
  );
  await page.route(/\/auth\/v1\//, (r) =>
    r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(session) }),
  );
  await page.addInitScript(
    ({ key, s }) => {
      window.__src = async (id) => {
        const src = window.__map?.getSource(id);
        return src ? await src.getData() : null;
      };
      if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(s));
    },
    { key: `sb-${PROJECT_REF}-auth-token`, s: session },
  );
}
