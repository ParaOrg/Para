// Cloudflare's Turnstile script, standing in: every widget passes a moment
// after it is drawn, with a token of its own. For the suites that sign in or
// upload with a site key in the build (CI gives them Cloudflare's always-pass
// test key), so none waits on Cloudflare's servers. With `interactive`, a widget
// instead asks for a tap, as Cloudflare does when it is unsure: it calls
// before-interactive-callback, draws a "Verify you are human" button, and passes
// only once that is pressed. stand-ins.mjs serves the same script, always passing, to every
// context of a run without PARA_LIVE_SERVICES; a suite's own fakeTurnstile wins, a page's route
// being asked first.

/** Cloudflare's Turnstile host: its script, and the frames the real script draws. */
export const TURNSTILE = /^https:\/\/challenges\.cloudflare\.com\//;

/** The stand-in's own mark, which scripts/checks/build/strings.mjs proves no build carries. */
export const STAND_IN_MARK = 'para-e2e-turnstile-stand-in';

/** The stand-in script, passing each widget a moment after it is drawn, or once tapped with `isInteractive`. */
export const turnstileScript = (isInteractive) => `
  // ${STAND_IN_MARK}
  let n = 0;
  window.turnstile = {
    render(el, o) {
      const id = 'w' + ++n;
      el.dataset.appearance = o.appearance ?? 'always';
      el.dataset.standIn = '${STAND_IN_MARK}';
      if (!${isInteractive}) {
        el.textContent = 'Turnstile stand-in ' + id;
        setTimeout(() => o.callback('token-' + id), 50);
        return id;
      }
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = 'Verify you are human';
      button.onclick = () => {
        button.remove();
        o['after-interactive-callback']?.();
        o.callback('token-' + id);
      };
      el.append(button);
      setTimeout(() => o['before-interactive-callback']?.(), 50);
      return id;
    },
    remove() {},
  };
`;

/** Routes `page`'s request for Cloudflare's Turnstile script to the stand-in. */
export const fakeTurnstile = (page, { interactive = false } = {}) =>
  page.route(TURNSTILE, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'text/javascript',
      body: turnstileScript(interactive),
    }),
  );
