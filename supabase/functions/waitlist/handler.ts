// The waitlist form on /app/ posts here. One request does three things, in this order: asks
// Cloudflare whether the bot check passed, saves the email in public.waitlist, and sends one
// confirmation through Resend. It answers the same for a new email and for one already listed,
// so the form never tells anyone who is on the list.
//
// Plain fetch and no imports, so tests/unit/waitlist-test.mjs runs it under Node with a fake fetch.

export interface Env {
  supabaseUrl: string;
  /** The project's secret key: the only thing that writes public.waitlist. */
  secretKey: string;
  turnstileSecret: string;
  resendKey: string;
  /** The sender, on the domain Resend has verified: "Para <hello@para-commute.org>". */
  from: string;
}

// /app/ is on para-commute.org and the function on supabase.co, so the browser asks first.
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const answer = (status: number, body: object) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });

const MESSAGE = `Salamat! You're on the list for Para on iPhone.

We'll email you once, when the iPhone app is out. Until then you can record a ride in your browser at https://www.para-commute.org/contribute/

Didn't sign up, or changed your mind? Reply to this email and we'll take you off the list.

Para`;

export async function handle(
  request: Request,
  env: Env,
  send: typeof fetch = fetch,
): Promise<Response> {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  if (request.method !== 'POST') return answer(405, { error: 'method' });

  const body = await request.json().catch(() => null);
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
  const token = typeof body?.token === 'string' ? body.token : '';
  // The table's check is the rule on an email's shape. This only saves the two calls below.
  if (!email.includes('@') || email.length > 254) return answer(400, { error: 'email' });

  const check = await send('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    body: new URLSearchParams({ secret: env.turnstileSecret, response: token }),
  }).catch(() => null);
  // A check that cannot be reached counts as not passed, never as let through.
  const passed = check?.ok === true && (await check.json()).success === true;
  if (!passed) return answer(403, { error: 'check' });

  // ignore-duplicates: an email already listed comes back as no row, and gets no second message.
  const saved = await send(`${env.supabaseUrl}/rest/v1/waitlist?on_conflict=email`, {
    method: 'POST',
    // The secret key goes on apikey alone. It is not a JWT, so as a Bearer token it is refused.
    headers: {
      apikey: env.secretKey,
      'Content-Type': 'application/json',
      Prefer: 'resolution=ignore-duplicates,return=representation',
    },
    body: JSON.stringify({ email }),
  }).catch(() => null);
  if (saved?.status === 400) return answer(400, { error: 'email' });
  if (!saved?.ok) {
    console.error('waitlist: saving answered', saved?.status ?? 'nothing');
    return answer(502, { error: 'later' });
  }
  const added = (await saved.json()).length > 0;

  if (added) {
    const mailed = await send('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: env.from,
        to: [email],
        reply_to: 'para.ph.info@gmail.com',
        subject: "You're on the list for Para on iPhone",
        text: MESSAGE,
      }),
    }).catch(() => null);
    // The email is saved, so the person is on the list either way: a failed send is logged, not shown.
    if (!mailed?.ok) console.error('waitlist: Resend answered', mailed?.status ?? 'nothing');
  }
  return answer(200, { ok: true });
}
