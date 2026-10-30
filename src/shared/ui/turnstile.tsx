import { useEffect, useRef, useState } from 'react';

/** The part of Cloudflare's Turnstile script this page uses. */
interface TurnstileApi {
  render: (
    container: HTMLElement,
    options: {
      sitekey: string;
      callback: (token: string) => void;
      'expired-callback': () => void;
      'error-callback': () => void;
      appearance?: TurnstileAppearance;
      'before-interactive-callback'?: () => void;
      'after-interactive-callback'?: () => void;
      'timeout-callback'?: () => void;
    },
  ) => string;
  remove: (widgetId: string) => void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

const SCRIPT_URL = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

const scriptLoads = new Map<string, Promise<TurnstileApi>>();

/** Cloudflare's script, added once, on the first widget a page shows; after a failure the next widget tries again. */
function loadTurnstile(url: string): Promise<TurnstileApi> {
  const loading =
    scriptLoads.get(url) ??
    new Promise<TurnstileApi>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = url;
      script.async = true;
      const fail = (reason: string) => {
        scriptLoads.delete(url);
        script.remove();
        reject(new Error(reason));
      };
      script.onload = () => {
        if (window.turnstile) resolve(window.turnstile);
        else fail('Turnstile loaded without its API');
      };
      script.onerror = () => fail('Turnstile could not load');
      document.head.append(script);
    });
  scriptLoads.set(url, loading);
  return loading;
}

/**
 * Cloudflare's own names: `always` draws the widget from the start; `interaction-only` draws
 * nothing unless Cloudflare needs the person to tap it.
 */
export type TurnstileAppearance = 'always' | 'interaction-only';

/** Interaction-only draws nothing most of the time, so its waiting line is for screen readers. */
const CHECKING_LINE = {
  always: 'text-sm text-content-secondary',
  'interaction-only': 'sr-only',
} satisfies Record<TurnstileAppearance, string>;

interface TurnstileProps {
  siteKey: string;
  /** The check's token once it passes, and null when it expires or fails. A token is good for one request. */
  onToken: (token: string | null) => void;
  /** Cloudflare's script; a story points it elsewhere to show loading and failing. */
  scriptUrl?: string;
  appearance?: TurnstileAppearance;
  /** Told true when Cloudflare asks the person to tap the widget, and false once it no longer does. */
  onNeedsTap?: (needsTap: boolean) => void;
}

/**
 * Cloudflare's check that a person, not a script, is at the page. Most people
 * see a tick and nothing to do. Remount it (a new `key`) for a fresh token
 * after each request, since Supabase accepts a token once.
 */
export function Turnstile({
  siteKey,
  onToken,
  scriptUrl = SCRIPT_URL,
  appearance = 'always',
  onNeedsTap,
}: TurnstileProps) {
  const container = useRef<HTMLDivElement>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [hasPassed, setHasPassed] = useState(false);
  const onTokenRef = useRef(onToken);
  const onNeedsTapRef = useRef(onNeedsTap);

  useEffect(() => {
    onTokenRef.current = onToken;
    onNeedsTapRef.current = onNeedsTap;
  }, [onToken, onNeedsTap]);

  useEffect(() => {
    let widgetId: string | null = null;
    let isCurrent = true;
    loadTurnstile(scriptUrl)
      .then((api) => {
        if (!isCurrent || !container.current) return;
        widgetId = api.render(container.current, {
          sitekey: siteKey,
          appearance,
          callback: (token) => {
            setProblem(null);
            setHasPassed(true);
            onNeedsTapRef.current?.(false);
            onTokenRef.current(token);
          },
          'before-interactive-callback': () => onNeedsTapRef.current?.(true),
          'after-interactive-callback': () => onNeedsTapRef.current?.(false),
          // An unsolved tap resets the widget, which asks again: the person still needs to tap.
          'timeout-callback': () => onNeedsTapRef.current?.(true),
          'expired-callback': () => {
            setHasPassed(false);
            onTokenRef.current(null);
          },
          'error-callback': () => {
            onTokenRef.current(null);
            setProblem(
              'The check that you are a person did not finish. Reload the page and try again.',
            );
          },
        });
      })
      .catch(() => {
        if (isCurrent) {
          setProblem(
            'The check that you are a person could not load. Check your connection and reload.',
          );
        }
      });
    return () => {
      isCurrent = false;
      if (widgetId !== null) window.turnstile?.remove(widgetId);
    };
  }, [siteKey, scriptUrl, appearance]);

  return (
    <div className="flex flex-col gap-1">
      <div ref={container} aria-label="Check that you are a person" role="group" />
      {problem ? (
        <p role="alert" className="text-sm text-content-primary">
          {problem}
        </p>
      ) : (
        !hasPassed && (
          <p aria-live="polite" className={CHECKING_LINE[appearance]}>
            Checking that you are a person…
          </p>
        )
      )}
    </div>
  );
}
