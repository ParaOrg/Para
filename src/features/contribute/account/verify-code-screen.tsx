import { useState } from 'react';

import { Button } from '@/design-system/primitives/button';
import { OtpField } from '@/design-system/primitives/otp-field';

import { checkCode, type CodeFields } from './account-fields';
import { AccountPage } from './account-page';
import { maskEmail } from './mask-email';
import type { Captcha } from './use-captcha';

interface VerifyCodeScreenProps {
  /** Where the code went, shown masked. */
  email: string;
  isBusy: boolean;
  isResending: boolean;
  /** One line about the last try, or null. */
  error: string | null;
  /** The bot check a Resend sends with. */
  captcha: Captcha;
  onSubmit: (fields: CodeFields) => void;
  onResend: () => void;
  /** The back arrow: to the email. */
  onBack: () => void;
}

/** A password reset's second step (Figma 4461:4762): the 6-digit code from the email. */
export function VerifyCodeScreen({
  email,
  isBusy,
  isResending,
  error,
  captcha,
  onSubmit,
  onResend,
  onBack,
}: VerifyCodeScreenProps) {
  const [code, setCode] = useState('');
  const [codeError, setCodeError] = useState<string | undefined>();

  const handleSubmit = () => {
    const checked = checkCode({ code });
    setCodeError(checked.isValid ? undefined : checked.errors.code);
    if (checked.isValid) onSubmit(checked.value);
  };

  return (
    <AccountPage
      title="Enter the code"
      subtitle={`Enter the verification code sent to ${maskEmail(email)}`}
      onBack={onBack}
      isBackDisabled={isBusy || isResending}
      error={error}
      captcha={captcha}
      onSubmit={handleSubmit}
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
        <Button
          type="submit"
          variant="primary"
          label={isBusy ? 'Verifying…' : 'Verify'}
          disabled={isBusy || isResending}
        />
      }
    >
      {/* Figma sets the boxes 24 in, 4 more than the page's fields. */}
      <div className="px-1">
        <OtpField label="Verification code" value={code} error={codeError} onChange={setCode} />
      </div>
    </AccountPage>
  );
}
