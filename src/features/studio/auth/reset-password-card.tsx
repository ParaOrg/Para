import { useId } from 'react';

import { Button } from '@/design-system/primitives/button';
import { PasswordField } from '@/design-system/primitives/password-field';
import { coarse } from '@/features/routes/map/map-view';

import { AuthCard } from './auth-card';
import { PASSWORD_MIN_LENGTH, PASSWORD_RULE_HINT } from './password-rule';

/** Which field a message belongs under: the rule is the new password's, the rest the pair's. */
export interface ResetError {
  field: 'password' | 'confirm';
  message: string;
}

interface ResetPasswordCardProps {
  /** Arrived from an invite: the account's first password, so nothing to skip to. */
  isInvite: boolean;
  password: string;
  confirm: string;
  isBusy: boolean;
  error: ResetError | null;
  onPasswordChange: (password: string) => void;
  onConfirmChange: (confirm: string) => void;
  onSubmit: () => void;
  /** Skip for now: keep the old password. */
  onSkip: () => void;
}

/**
 * The new password, after a reset link or an invite, in the sign-in's card
 * (Figma 4618:10477): the two fields with the rule under the first, Save
 * password, and Skip for now unless it is an invite.
 */
export function ResetPasswordCard({
  isInvite,
  password,
  confirm,
  isBusy,
  error,
  onPasswordChange,
  onConfirmChange,
  onSubmit,
  onSkip,
}: ResetPasswordCardProps) {
  const hintId = useId();
  const errorUnder = (field: ResetError['field']) =>
    error?.field === field ? error.message : undefined;

  return (
    <AuthCard
      title={isInvite ? 'Set your password' : 'Choose a new password'}
      subtitle={
        isInvite
          ? 'Welcome to Para Studio. You are signed in from your invite. Choose a password to sign in with next time.'
          : 'You are signed in from your reset link. Set a password to finish.'
      }
      fields={
        <>
          <div className="flex flex-col gap-1.5">
            <PasswordField
              label="New password"
              aria-describedby={hintId}
              required
              // eslint-disable-next-line jsx-a11y/no-autofocus -- this overlay opens for typing, so its first field takes focus; not on touch, where it would open the keyboard unasked
              autoFocus={!coarse}
              minLength={PASSWORD_MIN_LENGTH}
              autoComplete="new-password"
              value={password}
              onChange={(event) => onPasswordChange(event.target.value)}
              error={errorUnder('password')}
            />
            <p id={hintId} className="font-sn-pro text-sm/5 text-content-tertiary">
              {PASSWORD_RULE_HINT}
            </p>
          </div>
          <PasswordField
            label="Confirm new password"
            required
            minLength={PASSWORD_MIN_LENGTH}
            autoComplete="new-password"
            value={confirm}
            onChange={(event) => onConfirmChange(event.target.value)}
            error={errorUnder('confirm')}
          />
        </>
      }
      onSubmit={onSubmit}
      actions={
        <>
          <Button
            type="submit"
            variant="primary"
            label={isBusy ? 'Saving…' : 'Save password'}
            disabled={isBusy}
          />
          {!isInvite && (
            <Button
              variant="secondary"
              label="Skip for now"
              title="Stay signed in with your old password"
              onClick={onSkip}
            />
          )}
        </>
      }
    />
  );
}
