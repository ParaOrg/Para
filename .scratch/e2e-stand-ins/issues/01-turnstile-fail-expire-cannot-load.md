# The browser suites never see Turnstile fail, expire or not load

Status: needs-triage
Type: task
Priority: low

## What is missing

`src/shared/ui/turnstile.tsx` handles three states besides a pass:

- `error-callback`: "The check that you are a person did not finish. Reload the page and try again."
- `expired-callback`: the token is withdrawn (`onToken(null)`) and the waiting line comes back.
- the script failing to load: "The check that you are a person could not load. Check your
  connection and reload."

No suite under `tests/e2e/` reaches any of them. The stand-in (`tests/e2e/lib/fake-turnstile.mjs`)
only passes, at once or after a tap (`interactive`). What the sign-in, Forgot password, Change
password and a contributor's first upload do in each state (a form's button, the message, a retry
with a fresh widget) is checked nowhere in a browser.

## What would cover it

Modes for `fakeTurnstile`, alongside `interactive`:

- `fails`: calls `error-callback` instead of `callback`;
- `expires`: passes, then calls `expired-callback` after a moment;
- `cannotLoad`: answers the script with an error status, so `script.onerror` runs.

Then checks in turnstile-test (the studio) and account-test (the contributor page) that each
state shows its message and keeps the form from sending, and that a fresh widget recovers.

## Storybook reaches Cloudflare in CI

The Storybook job (`.github/workflows/ci.yml`, `storybook`; `scripts/checks/storybook-play.mjs`)
opens every story in Chromium with no routing. So these stories load Cloudflare's real script on
every run, outside the e2e suites' `outside:` audit:

- `src/shared/ui/turnstile.stories.tsx`: Passes (always-pass test key), Fails (always-fail test
  key), InteractionOnly;
- the stories that render the widget inside a form: `features/studio/auth/sign-in-card`,
  `change-password`, `features/contribute/account/account-settings-screen`,
  `change-password-screen`.

Loading and CannotLoad use a `data:` script and reach nothing. Whether the Storybook check should
stand Cloudflare in too, and how the Fails story then still shows Cloudflare's own failure, is part
of this ticket. Nothing is changed yet.
