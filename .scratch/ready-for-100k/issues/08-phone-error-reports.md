# 08: Hearing about errors on commuters' phones

Status: needs-info (owner: choose A, B or later)
Type: decision
Who: the owner decides; then Opus builds

## The question

04 tells the owner when the site, the tiles or a job is down. It can't see an error that happens only on a commuter's phone: a crash, a map that fails to load on one kind of phone, a card that throws. Should the app report those?

- **A. Sentry,** the standard error-reporting service. It has a free tier (check its current limits on sentry.io). It's a new service and a new dependency, and the reports go to a company outside Cloudflare, Supabase and GitHub.
- **B. Our own:** the app sends a short error note to a small Para Worker, which keeps a count and the latest examples. No new company, but more of our own code to keep, and it uses Worker requests.
- **Later:** wait until 04 and the load test are done and real commuters are using it.

Either way, a report never carries the commuter's location, the route they looked at, or anything that identifies them. Only the error, the page, the browser and the app's version.

## Comments
