import { useId } from 'react';

import { Button } from '@/design-system/primitives/button';
import { ButtonLink } from '@/design-system/primitives/button-link';
import { FieldError } from '@/design-system/primitives/field-error';
import { PasswordField } from '@/design-system/primitives/password-field';
import { TextField } from '@/design-system/primitives/text-field';
import { coarse } from '@/features/routes/map/map-view';

import { AuthCard } from './auth-card';
import { CheckEmailCard } from './check-email-card';
import type { Captcha } from './use-captcha';
import type { SignInMode } from './use-sign-in';

const SUBTITLE = 'Login your admin account';

interface SignInCardProps {
  /** Heading while signing in. */
  title: string;
  mode: SignInMode;
  email: string;
  password: string;
  isBusy: boolean;
  /** The reset link went: the card says to check the email. */
  isSent: boolean;
  /** One line about the last try, or null. */
  error: string | null;
  /**
   * A message the card opens with, such as why a reset link was refused: in the error's place
   * under Password, with neither field marked wrong.
   */
  notice?: string | null;
  captcha: Captcha;
  onEmailChange: (email: string) => void;
  onPasswordChange: (password: string) => void;
  onModeChange: (mode: SignInMode) => void;
  onSubmit: () => void;
  /** Done, after "Check your email". */
  onSentDone: () => void;
  /**
   * Closes the card. Without it the card is the studio's front door: there is
   * nothing behind it to go back to, so its secondary button is a link to the
   * public map instead of Cancel.
   */
  onDismiss?: () => void;
}

/**
 * The sign-in card (Figma 4618:10356, its error state 4618:10526): email and
 * password, Turnstile, Sign in, the way out and Forgot password. Its Forgot
 * password asks for the email a reset link goes to (4618:10369, in the link
 * flow's words), then says to check it.
 */
export function SignInCard({
  title,
  mode,
  email,
  password,
  isBusy,
  isSent,
  error,
  notice = null,
  captcha,
  onEmailChange,
  onPasswordChange,
  onModeChange,
  onSubmit,
  onSentDone,
  onDismiss,
}: SignInCardProps) {
  const noticeId = useId();
  const leave = onDismiss ? (
    <Button variant="secondary" label="Cancel" onClick={onDismiss} />
  ) : (
    <ButtonLink variant="secondary" label="Public map" href="/" />
  );

  if (isSent) return <CheckEmailCard email={email} onDone={onSentDone} onDismiss={onDismiss} />;

  const emailField = (
    <TextField
      label="Email"
      type="email"
      onClear={() => onEmailChange('')}
      required
      // eslint-disable-next-line jsx-a11y/no-autofocus -- this overlay opens for typing, so its first field takes focus; not on touch, where it would open the keyboard unasked
      autoFocus={!coarse}
      autoComplete="email"
      value={email}
      onChange={(event) => onEmailChange(event.target.value)}
      // Signing in, a failure is about the pair: both fields turn red, the one message under Password.
      isInvalid={mode === 'signin' && !!error}
      error={mode === 'forgot' ? (error ?? undefined) : undefined}
    />
  );

  if (mode === 'forgot') {
    return (
      <AuthCard
        title="Forgot password"
        onDismiss={onDismiss}
        fields={emailField}
        captcha={captcha}
        onSubmit={onSubmit}
        actions={
          <>
            <Button
              type="submit"
              variant="primary"
              label={isBusy ? 'Sending…' : 'Send reset link'}
              disabled={isBusy || !captcha.isReady}
            />
            {leave}
            <Button variant="plain" label="Sign in" onClick={() => onModeChange('signin')} />
          </>
        }
      />
    );
  }

  return (
    <AuthCard
      title={title}
      subtitle={SUBTITLE}
      hasLogo
      onDismiss={onDismiss}
      fields={
        <>
          {emailField}
          {/* The field's own gap to its message, so a notice sits where an error would. */}
          <div className="flex flex-col gap-1.5">
            <PasswordField
              label="Password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(event) => onPasswordChange(event.target.value)}
              error={error ?? undefined}
              aria-describedby={notice && !error ? noticeId : undefined}
            />
            {notice && !error && <FieldError id={noticeId} message={notice} />}
          </div>
        </>
      }
      captcha={captcha}
      onSubmit={onSubmit}
      actions={
        <>
          <Button
            type="submit"
            variant="primary"
            label={isBusy ? 'Signing in…' : 'Sign in'}
            disabled={isBusy || !captcha.isReady}
          />
          {leave}
          <Button variant="plain" label="Forgot password" onClick={() => onModeChange('forgot')} />
        </>
      }
    />
  );
}
