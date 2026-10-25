import { useEffect, type ReactNode } from 'react';

import { Turnstile } from '@/shared/ui/turnstile';

import { useFocusHeading } from '../use-focus-heading';
import { useStackRoom } from '../use-stack-room';
import type { Captcha } from './use-captcha';

interface AccountPanelProps {
  /** The screen's name for a screen reader; the buttons already say it on screen. */
  title: string;
  /** The fields, in order. */
  children: ReactNode;
  /** One line under the fields: what went wrong. */
  error: string | null;
  /** One line above the fields that is not a problem: what just happened. */
  notice?: string;
  /** The bot check, for the screens that sign in or make a user; none for the one that does neither. */
  captcha?: Captcha;
  /** The buttons: the main one first. */
  actions: ReactNode;
  onSubmit: () => void;
}

/** The sheet along the bottom that Sign in and Create account share: fields, the bot check, buttons. */
export function AccountPanel({
  title,
  children,
  error,
  notice,
  captcha,
  actions,
  onSubmit,
}: AccountPanelProps) {
  const headingRef = useFocusHeading();
  const stackRef = useStackRoom();
  const onToken = captcha?.onToken;

  // The widget goes with the screen; its token must not outlive it.
  useEffect(() => () => onToken?.(null), [onToken]);

  return (
    <section
      ref={stackRef}
      aria-labelledby="account-heading"
      className="absolute inset-x-0 bottom-0 z-10 max-h-dvh overflow-y-auto bg-surface p-4 pb-[max(1rem,env(safe-area-inset-bottom))] font-sn-pro text-content-primary shadow-bottom-sheet-top-shadow"
    >
      <h1 id="account-heading" ref={headingRef} tabIndex={-1} className="sr-only">
        {title}
      </h1>
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
        className="flex flex-col gap-4"
      >
        {notice && (
          <p role="status" className="text-sm/5 text-content-primary">
            {notice}
          </p>
        )}
        {children}
        {error && (
          <p role="alert" className="text-sm/5 text-content-primary">
            {error}
          </p>
        )}
        {captcha?.siteKey && (
          <Turnstile key={captcha.round} siteKey={captcha.siteKey} onToken={captcha.onToken} />
        )}
        <div className="flex flex-col gap-2">{actions}</div>
      </form>
    </section>
  );
}
