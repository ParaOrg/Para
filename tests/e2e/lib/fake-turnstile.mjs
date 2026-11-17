// Cloudflare's Turnstile script, standing in: by default every widget passes a moment after it
// is drawn, with a token of its own, whether drawn by render() or, as a .cf-turnstile element, by
// the script itself on load. For the suites that sign in or upload with a site key in the build
// (CI gives them Cloudflare's always-pass test key), so none waits on Cloudflare's servers. Its
// other modes (TURNSTILE_MODES) ask for a tap first, fail, expire after passing, act as
// Cloudflare's own test keys do, or leave the script unloadable, for the checks of each state.
// stand-ins.mjs serves the passing script to every context of a run without PARA_LIVE_SERVICES;
// a suite's own fakeTurnstile wins, a page's route being asked first.

/** Cloudflare's Turnstile host: its script, and the frames the real script draws. */
export const TURNSTILE = /^https:\/\/challenges\.cloudflare\.com\//;

/** The stand-in's own mark, which scripts/checks/build/strings.mjs proves no build carries. */
export const STAND_IN_MARK = 'para-e2e-turnstile-stand-in';

/**
 * What the stand-in does with each widget:
 * - `passes`: a token a moment after it is drawn;
 * - `interactive`: a "Verify you are human" button first, as Cloudflare does when it is unsure;
 * - `fails`: error-callback, no token;
 * - `expires`: a token, then expired-callback a moment later;
 * - `byKey`: as Cloudflare's own test keys do — 1x…AA passes, 2x…AB fails, 3x…FF asks for a tap.
 * `cannotLoad` is no script at all: fakeTurnstile answers the script with an error.
 */
export const TURNSTILE_MODES = ['passes', 'interactive', 'fails', 'expires', 'byKey', 'cannotLoad'];

/** Cloudflare's test site keys (its Turnstile docs, "Testing"), as the mode each acts like. */
const TEST_KEY_MODES = {
  '1x00000000000000000000AA': 'passes',
  '2x00000000000000000000AB': 'fails',
  '3x00000000000000000000FF': 'interactive',
};

/** The stand-in script for `mode` (TURNSTILE_MODES); `true` and `false` are `interactive` and `passes`. */
export const turnstileScript = (modeOrInteractive) => {
  const mode =
    typeof modeOrInteractive === 'string'
      ? modeOrInteractive
      : modeOrInteractive
        ? 'interactive'
        : 'passes';
  if (!TURNSTILE_MODES.includes(mode) || mode === 'cannotLoad') {
    throw new Error(`no Turnstile stand-in script for mode "${mode}"`);
  }
  return `
  // ${STAND_IN_MARK}
  const TEST_KEY_MODES = ${JSON.stringify(TEST_KEY_MODES)};
  let n = 0;
  window.turnstile = {
    render(el, o) {
      const id = 'w' + ++n;
      el.dataset.appearance = o.appearance ?? 'always';
      el.dataset.standIn = '${STAND_IN_MARK}';
      const mode = '${mode}' === 'byKey' ? TEST_KEY_MODES[o.sitekey] : '${mode}';
      if (!mode) throw new Error('Turnstile stand-in: no test key ' + o.sitekey);
      if (mode === 'interactive') {
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
      }
      el.textContent = 'Turnstile stand-in ' + id;
      if (mode === 'fails') {
        setTimeout(() => o['error-callback']?.(), 50);
        return id;
      }
      setTimeout(() => o.callback('token-' + id), 50);
      if (mode === 'expires') setTimeout(() => o['expired-callback']?.(), 1500);
      return id;
    },
    remove() {},
    reset() {},
  };
  // As the real script does on load: each .cf-turnstile element on the page drawn by itself, with
  // the hidden cf-turnstile-response input its form sends.
  for (const el of document.querySelectorAll('.cf-turnstile')) {
    window.turnstile.render(el, {
      sitekey: el.dataset.sitekey,
      callback: (token) => (input.value = token),
    });
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = 'cf-turnstile-response';
    el.append(input);
  }
`;
};

/**
 * Routes `page`'s request for Cloudflare's Turnstile script to the stand-in in `mode`
 * (TURNSTILE_MODES); `interactive: true` is the `interactive` mode. `cannotLoad` answers the
 * script with an error, as an outage or a blocker would.
 */
export const fakeTurnstile = (
  page,
  { interactive = false, mode = interactive ? 'interactive' : 'passes' } = {},
) =>
  page.route(TURNSTILE, (route) =>
    mode === 'cannotLoad'
      ? route.fulfill({ status: 503, contentType: 'text/plain', body: '' })
      : route.fulfill({
          status: 200,
          contentType: 'text/javascript',
          body: turnstileScript(mode),
        }),
  );
