# Retire the old site on Villaralvorovic2

The site used to run as the `parapo` Worker in the old **Villaralvorovic2** Cloudflare account, at
`parapo.villaralvorovic2.workers.dev`, with its staging copy at
`staging-parapo.villaralvorovic2.workers.dev`. It now runs at **https://www.para-commute.org**.
This page turns both old addresses into permanent redirects to the new one, and tells an app that
was installed from the old address to let go of it.

That account is not connected to the project's tools, so the owner does these steps by hand. They
take about ten minutes.

## What the redirect does

- Every request to either old address answers **301** to `https://www.para-commute.org`, with the
  same path and query: `/contribute/` goes to `/contribute/`, `/studio/?x=1` to `/studio/?x=1`.
- `/sw.js` and `/contribute/sw.js`, the paths of the old site's two offline workers (the map's and
  the contributor page's), answer **200** with a worker that removes itself instead. A browser
  refuses a redirect for a worker's script, so a redirect alone would leave an installed old app
  running from its own cache for good. The browser fetches the worker's script whenever the
  installed app is opened (and at least once a day). The replacement then empties the old caches,
  unregisters itself, and reloads the app's open windows. The reload reaches the network, and the
  301 takes it to the new address.

## The script

```js
// The old ParaPo site, retired: everything moves to www.para-commute.org.
const NEW_ORIGIN = 'https://www.para-commute.org';

// The old site's offline workers: the map's and the contributor page's.
const WORKER_PATHS = new Set(['/sw.js', '/contribute/sw.js']);

// A worker that removes itself: it empties this origin's caches, unregisters, and reloads the
// windows it controlled, which then reach the network and its redirect.
const SELF_REMOVING_WORKER = `
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.map((name) => caches.delete(name)));
    await self.registration.unregister();
    const windows = await self.clients.matchAll({ type: 'window' });
    for (const client of windows) client.navigate(client.url);
  })());
});
`;

export default {
  async fetch(request) {
    const url = new URL(request.url);
    if (WORKER_PATHS.has(url.pathname)) {
      return new Response(SELF_REMOVING_WORKER, {
        headers: {
          'content-type': 'text/javascript; charset=utf-8',
          'cache-control': 'no-store',
        },
      });
    }
    return Response.redirect(NEW_ORIGIN + url.pathname + url.search, 301);
  },
};
```

## Why it is deployed with Wrangler and not pasted in the dashboard

The old `parapo` Worker serves its files as **static assets**, and Cloudflare serves an asset
before the Worker's script ever runs. Code pasted into the dashboard's editor would sit behind the
old site's files and never answer. Deploying from a folder that has a script and no assets
replaces the Worker as a whole.

`staging-parapo` is an **alias of one uploaded version** (the old staging branch's), not a
second Worker. It keeps pointing at the old site until a new version is uploaded under the same
alias, `staging`. Step 4 does that.

## Steps

You need Node.js on the computer (any recent version) and the Villaralvorovic2 account's sign-in.

1. **Stop the old builds.** In the Cloudflare dashboard, switch to the **Villaralvorovic2**
   account. Go to **Workers & Pages → parapo → Settings → Build**. If a Git repository is
   connected, choose **Disconnect**. Otherwise the next push to that repository would deploy the old
   site over the redirect.
2. **Make a folder** called `parapo-redirect` with two files:
   - `worker.js`: the script above.
   - `wrangler.jsonc`:

     ```jsonc
     {
       "name": "parapo",
       "main": "worker.js",
       "compatibility_date": "2026-11-01",
       "workers_dev": true,
       "preview_urls": true,
     }
     ```

3. **Deploy the main address.** In a terminal, in that folder:

   ```sh
   npx wrangler login
   npx wrangler deploy
   ```

   `wrangler login` opens the browser: sign in to **Villaralvorovic2**, not the Para account. If
   the account picker appears, choose Villaralvorovic2. If Wrangler warns that the deploy removes
   the Worker's assets, answer yes: that is the point.
4. **Move the staging address** to the same script:

   ```sh
   npx wrangler versions upload --preview-alias staging
   ```

5. **Check both addresses.** In the terminal:

   ```sh
   curl -sI https://parapo.villaralvorovic2.workers.dev/contribute/ | head -3
   curl -sI https://staging-parapo.villaralvorovic2.workers.dev/studio/ | head -3
   curl -s https://parapo.villaralvorovic2.workers.dev/sw.js | head -3
   ```

   The first two must say `HTTP/2 301` and `location: https://www.para-commute.org/contribute/`
   (and `/studio/`). The third must print the self-removing worker's first lines, not a redirect.
6. **Delete the review preview Worker.** In **Workers & Pages**, open
   `parapo-studio-review-preview` → **Settings** → **Delete**. It only served an old review guide.
7. **Tell the hub the redirect is live.** The repository's cleanup (the old origins removed from
   the tiles Worker's allow-list) waits for it. Merged earlier, it would break the old site's map
   before the old site redirected.

## Do not delete

- **The Turnstile widget** in the Villaralvorovic2 account (**Turnstile → ParaPo**). Its site key
  is `VITE_TURNSTILE_SITE_KEY` in `.env.production` and `.env.apk`, and its secret is in
  Supabase's Auth settings. The studio's sign-in and the contributor's first save need it today.
  Moving it to the Para account is a later step (`docs/operations.md`, the account checklist).
- **The account itself**, while the widget lives there.

## Undo

Deploying the old site again means a build of the old repository's `dist/` with the old
`wrangler.jsonc` (assets, `name: parapo`). There is no reason to: the new address serves the same
app.
