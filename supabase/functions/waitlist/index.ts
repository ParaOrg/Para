// The Deno entry point: reads the function's secrets and hands each request to handler.ts.
// SUPABASE_URL and SUPABASE_SECRET_KEYS are set by Supabase. The other three are set by the owner
// (supabase/apply/README.md, "Applying waitlist").
import { handle } from './handler.ts';

declare const Deno: {
  env: { get(name: string): string | undefined };
  serve(handler: (request: Request) => Promise<Response>): void;
};

const secret = (name: string) => {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`waitlist: the secret ${name} is not set`);
  return value;
};

Deno.serve((request) =>
  handle(request, {
    supabaseUrl: secret('SUPABASE_URL'),
    secretKey: JSON.parse(secret('SUPABASE_SECRET_KEYS')).default,
    turnstileSecret: secret('TURNSTILE_SECRET_KEY'),
    resendKey: secret('RESEND_API_KEY'),
    from: secret('WAITLIST_FROM'),
  }),
);
