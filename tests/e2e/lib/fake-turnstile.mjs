// Cloudflare's Turnstile script, standing in: every widget passes a moment
// after it is drawn, with a token of its own. For the suites that sign in or
// upload with a site key in the build (CI gives them Cloudflare's always-pass
// test key), so none waits on Cloudflare's servers. With `interactive`, a widget
// instead asks for a tap, as Cloudflare does when it is unsure: it calls
// before-interactive-callback, draws a "Verify you are human" button, and passes
// only once that is pressed.

const script = (isInteractive) => `
  let n = 0;
  window.turnstile = {
    render(el, o) {
      const id = 'w' + ++n;
      el.dataset.appearance = o.appearance ?? 'always';
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
  page.route(/^https:\/\/challenges\.cloudflare\.com\//, (route) =>
    route.fulfill({ status: 200, contentType: 'text/javascript', body: script(interactive) }),
  );
