import { useEffect, useRef, useState } from 'react';

import { turnstileSiteKey } from './api/env';

const SCRIPT_URL = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

interface RenderableTurnstile {
  render: (container: HTMLElement, options: Record<string, unknown>) => string;
}

function isRenderable(value: unknown): value is RenderableTurnstile {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof Reflect.get(value, 'render') === 'function'
  );
}

/**
 * The spike's check of whether Cloudflare's bot check renders inside the app, whose origin is
 * https://localhost and not our domain. It shows each step Turnstile reaches, with its own error
 * code, which the real widget hides. Nothing is verified or sent anywhere.
 */
export function NativeTurnstileCheck() {
  const container = useRef<HTMLDivElement>(null);
  const [steps, setSteps] = useState<string[]>(['Loading the script…']);

  useEffect(() => {
    if (!turnstileSiteKey || !container.current) return;
    const mount = container.current;
    const note = (step: string) => setSteps((all) => [...all, step]);
    const script = document.createElement('script');
    script.src = SCRIPT_URL;
    script.async = true;
    script.onerror = () => note('Script failed to load (no network, or blocked).');
    script.onload = () => {
      const api: unknown = Reflect.get(window, 'turnstile');
      if (!isRenderable(api)) {
        note('Script loaded but window.turnstile is missing.');
        return;
      }
      note('Script loaded. Rendering the widget.');
      try {
        api.render(mount, {
          sitekey: turnstileSiteKey,
          callback: (token: string) => note(`Passed. Token of ${token.length} characters.`),
          'error-callback': (code: unknown) => note(`Error callback, code ${String(code)}.`),
          'timeout-callback': () => note('Timed out.'),
          'unsupported-callback': () => note('Browser unsupported.'),
        });
      } catch (error) {
        note(`render() threw: ${error instanceof Error ? error.message : String(error)}`);
      }
    };
    document.head.append(script);
    return () => script.remove();
  }, []);

  return (
    <div>
      <p>Page origin: {window.location.origin}</p>
      {!turnstileSiteKey && <p>No Turnstile site key in this build.</p>}
      <div ref={container} />
      <ol style={{ paddingLeft: 20 }}>
        {steps.map((step, index) => (
          // Steps only ever append, so the position is stable.
          <li key={index}>{step}</li>
        ))}
      </ol>
    </div>
  );
}
