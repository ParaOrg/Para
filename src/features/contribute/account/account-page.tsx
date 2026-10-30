import { useEffect, type ReactNode } from 'react';

import { IconButton } from '@/design-system/primitives/icon-button';
import { Turnstile } from '@/shared/ui/turnstile';

import { ArrowLeftIcon } from './arrow-left-icon';
import type { Captcha } from './use-captcha';
import { useFocusHeading } from '../common/use-focus-heading';

/** Sign in sits in the middle of the screen; the others start under the back button's row. */
type Placement = 'centre' | 'top';

const PLACEMENT = {
  centre: 'justify-center pt-[max(1.5rem,env(safe-area-inset-top))]',
  top: '',
} satisfies Record<Placement, string>;

interface AccountPageProps {
  /** The page's heading, as Figma writes it. */
  title: string;
  /** The line under the heading. */
  subtitle?: ReactNode;
  /** Above the heading, with its own space under it: Sign in's Para logo. */
  picture?: ReactNode;
  placement?: Placement;
  /** The arrow at the top left, on a 'top' page; none leaves its row empty. */
  onBack?: () => void;
  /**
   * The arrow waits while a request is out: leaving drops the request's answer, and a sign-up or
   * a code check signs the phone in whether or not the page is there to hear it.
   */
  isBackDisabled?: boolean;
  /** The fields, in order. */
  children: ReactNode;
  /** One red line above the main button: what went wrong. */
  error: string | null;
  /** One line above the fields that is not a problem: what just happened. */
  notice?: string;
  /** The bot check, for the pages that sign in or make a user. */
  captcha?: Captcha;
  /** The buttons: the main one first. */
  actions: ReactNode;
  onSubmit: () => void;
}

/**
 * The onboarding pages' frame (Figma 4451:7904, 4461:646, 4461:4689): a full page over the map,
 * the heading block, the fields, then the error line, the bot check and the buttons.
 */
export function AccountPage({
  title,
  subtitle,
  picture,
  placement = 'top',
  onBack,
  isBackDisabled = false,
  children,
  error,
  notice,
  captcha,
  actions,
  onSubmit,
}: AccountPageProps) {
  const headingRef = useFocusHeading();
  const onToken = captcha?.onToken;

  // The widget goes with the page; its token must not outlive it.
  useEffect(() => () => onToken?.(null), [onToken]);

  return (
    <section
      aria-labelledby="account-heading"
      className="absolute inset-0 z-20 overflow-y-auto bg-surface font-sn-pro text-content-primary"
    >
      <div
        className={
          'flex min-h-full flex-col gap-12 pb-[max(1.5rem,env(safe-area-inset-bottom))] ' +
          PLACEMENT[placement]
        }
      >
        {placement === 'top' && (
          <div className="box-content flex h-16 items-end px-4 pt-[env(safe-area-inset-top)]">
            {onBack && (
              <IconButton
                size="base"
                label="Back"
                icon={<ArrowLeftIcon />}
                disabled={isBackDisabled}
                onClick={onBack}
              />
            )}
          </div>
        )}
        <header className="flex flex-col items-center px-4">
          {picture}
          <div className="flex w-full flex-col gap-2 text-center">
            <h1
              id="account-heading"
              ref={headingRef}
              tabIndex={-1}
              className="text-3xl/9 font-bold outline-none"
            >
              {title}
            </h1>
            {subtitle && <p className="text-base-lower/6 text-content-tertiary">{subtitle}</p>}
          </div>
        </header>
        <form
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit();
          }}
          className="flex flex-col gap-8 px-5"
        >
          {notice && (
            <p role="status" className="text-base-lower/6 text-content-tertiary">
              {notice}
            </p>
          )}
          <div className="flex flex-col gap-4">{children}</div>
          <div className="flex flex-col gap-4">
            {error && (
              <p role="alert" className="text-sm/5 text-content-error">
                {error}
              </p>
            )}
            {captcha?.siteKey && (
              <Turnstile key={captcha.round} siteKey={captcha.siteKey} onToken={captcha.onToken} />
            )}
            {actions}
          </div>
        </form>
      </div>
    </section>
  );
}
