import { useId, type FormEvent, type ReactNode } from 'react';

import { Turnstile } from '@/shared/ui/turnstile';

import { AuthDialog } from './auth-dialog';
import paraLogo from './para-logo.svg';
import type { Captcha } from './use-captcha';

interface AuthCardProps {
  title: string;
  /** The line under the heading. */
  subtitle?: string;
  /** The Para logo beside the heading, as the sign-in draws it. */
  hasLogo?: boolean;
  /** What Escape does; without it, Escape leaves the card open (the studio's front door). */
  onDismiss?: () => void;
  /** The fields, in order; none for a card that only says something. */
  fields?: ReactNode;
  /** The bot check, under the fields and above the buttons, for a card that sends to Auth. */
  captcha?: Captcha;
  /** The buttons, the main one first. */
  actions: ReactNode;
  onSubmit: () => void;
}

/**
 * The studio's account card (Figma 4618:10356): the heading block, the fields, Turnstile and
 * the buttons, full width one under the other, in a modal dialog over a see-through dark page.
 */
export function AuthCard({
  title,
  subtitle,
  hasLogo = false,
  onDismiss,
  fields,
  captcha,
  actions,
  onSubmit,
}: AuthCardProps) {
  const headingId = useId();

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit();
  };

  return (
    <AuthDialog labelledBy={headingId} onDismiss={onDismiss} look="card">
      <form onSubmit={handleSubmit}>
        <div className="flex items-center gap-3 p-5">
          <div className="flex min-w-0 flex-1 flex-col gap-0.5 break-words">
            <h2 id={headingId} className="text-3xl/9 font-semibold text-content-primary">
              {title}
            </h2>
            {subtitle && <p className="text-base-lower/6 text-content-secondary">{subtitle}</p>}
          </div>
          {hasLogo && <img src={paraLogo} alt="" className="h-10 w-auto shrink-0" />}
        </div>
        {(fields || captcha?.siteKey) && (
          <div className="flex flex-col gap-3 px-5 py-4">
            {fields}
            {captcha?.siteKey && (
              <Turnstile key={captcha.round} siteKey={captcha.siteKey} onToken={captcha.setToken} />
            )}
          </div>
        )}
        <div className="flex flex-col gap-2 px-5 pb-5">{actions}</div>
      </form>
    </AuthDialog>
  );
}
