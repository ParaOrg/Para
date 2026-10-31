import { useEffect, useRef, useState } from 'react';

import { OtpField } from '@/design-system/primitives/otp-field';

import { checkCode, type CodeFields } from './account-fields';
import { AccountPage } from './account-page';
import { maskEmail } from './mask-email';
import type { Captcha } from './use-captcha';

/** A code the project refused: its line, and a key that is new for each refusal. */
export interface CodeRejection {
  message: string;
  key: number;
}

interface VerifyCodeScreenProps {
  /** Where the code went, shown masked. */
  email: string;
  isBusy: boolean;
  isResending: boolean;
  /** The code was wrong or expired: the boxes shake once and go red, the line under them. */
  rejection: CodeRejection | null;
  /** Any other line about the last check (no signal, the bot check), or null. The digits stay. */
  error: string | null;
  /** Why the last Resend did not go, or null. It leaves the boxes and their focus alone. */
  resendError: string | null;
  /** The bot check a Resend sends with. */
  captcha: Captcha;
  onSubmit: (fields: CodeFields) => void;
  onResend: () => void;
  /** The back arrow: to the email. */
  onBack: () => void;
}

/**
 * A password reset's second step (Figma 4461:4762): the 6-digit code from the email. There is no
 * Verify button (the owner's call over Figma): the code is checked as soon as the sixth digit is
 * in, typed or pasted.
 */
export function VerifyCodeScreen({
  email,
  isBusy,
  isResending,
  rejection,
  error,
  resendError,
  captcha,
  onSubmit,
  onResend,
  onBack,
}: VerifyCodeScreenProps) {
  const [code, setCode] = useState('');
  const [codeError, setCodeError] = useState<string | undefined>();
  // The refusal the person has started typing over: its red goes with the first new digit.
  const [clearedKey, setClearedKey] = useState<number | null>(null);
  const fieldRef = useRef<HTMLInputElement>(null);
  const shownRejection = rejection && rejection.key !== clearedKey ? rejection : null;
  const hasFailed = !!rejection || !!error;

  // The boxes are disabled while the code is checked, which takes their focus: give it back, so
  // the next code can be typed straight away.
  useEffect(() => {
    if (!isBusy && hasFailed) fieldRef.current?.focus();
  }, [isBusy, hasFailed]);

  const submit = (next: string) => {
    if (isBusy || isResending) return;
    const checked = checkCode({ code: next });
    setCodeError(checked.isValid ? undefined : checked.errors.code);
    if (checked.isValid) onSubmit(checked.value);
  };

  const handleChange = (next: string) => {
    setCode(next);
    setCodeError(undefined);
    if (rejection) setClearedKey(rejection.key);
    if (next.length === 6) submit(next);
  };

  // After a failure that kept the digits (no signal, the check), a tap on the boxes tries again.
  const handleClick = () => {
    if (error && code.length === 6) submit(code);
  };

  return (
    <AccountPage
      title="Enter the code"
      subtitle={`Enter the verification code sent to ${maskEmail(email)}`}
      onBack={onBack}
      isBackDisabled={isBusy || isResending}
      error={error ?? resendError}
      captcha={captcha}
      onSubmit={() => submit(code)}
      afterFields={
        <p className="text-center text-base-lower/6 font-medium text-content-quaternary">
          Didn’t receive a code?{' '}
          <button
            type="button"
            disabled={isBusy || isResending || !captcha.isReady}
            onClick={onResend}
            className="rounded-sm text-brand-surface disabled:opacity-60"
          >
            {isResending ? 'Sending…' : 'Resend'}
          </button>
        </p>
      }
      actions={
        // Always there, so the line is read out when it appears.
        <p role="status" className="text-center text-sm/5 text-content-tertiary">
          {isBusy ? 'Checking the code…' : null}
        </p>
      }
    >
      {/* Figma sets the boxes 24 in, 4 more than the page's fields. */}
      <div className="px-1">
        <OtpField
          ref={fieldRef}
          label="Verification code"
          value={code}
          error={shownRejection?.message ?? codeError}
          shakeKey={shownRejection?.key}
          disabled={isBusy || isResending}
          onChange={handleChange}
          onClick={handleClick}
        />
      </div>
    </AccountPage>
  );
}
