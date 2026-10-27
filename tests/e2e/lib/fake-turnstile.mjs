// Cloudflare's Turnstile script, standing in: every widget passes a moment
// after it is drawn, with a token of its own. For the suites that sign in or
// upload with a site key in the build (CI gives them Cloudflare's always-pass
// test key), so none waits on Cloudflare's servers.

const SCRIPT = `
  let n = 0;
  window.turnstile = {
    render(el, o) {
      const id = 'w' + ++n;
      el.textContent = 'Turnstile stand-in ' + id;
      setTimeout(() => o.callback('token-' + id), 50);
      return id;
    },
    remove() {},
  };
`;

/** Routes `page`'s request for Cloudflare's Turnstile script to the stand-in. */
export const fakeTurnstile = (page) =>
  page.route(/^https:\/\/challenges\.cloudflare\.com\//, (route) =>
    route.fulfill({ status: 200, contentType: 'text/javascript', body: SCRIPT }),
  );
