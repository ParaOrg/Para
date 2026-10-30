# Security

If you find a security problem in Para, please tell us privately first, not
in a public issue or pull request.

Report it on GitHub: the repository's **Security** tab, then **Report a
vulnerability**. Or email para.ph.info@gmail.com.

Say what you found, the steps to see it, and what someone could do with it.
Please don't test it on other people's accounts or data.

## What this covers

The public map, the studio, the contributor page and app, the tiles Worker,
the database's rules, and everything else in this repository.

## Public on purpose

These are in the repository and the JavaScript bundle by design, so finding
them is not a leak:

- the Supabase project URL and publishable key (`.env.production`, `.env.apk`);
  the database's row level security is what protects the data
- the Cloudflare Turnstile site key; its secret is only in Supabase
