import { useState } from 'react';

import { messageOf } from './account-message';
import { CreateAccountScreen } from './create-account-screen';
import { PasswordResetFlow } from './password-reset-flow';
import { ProfileStepScreen } from './profile-step-screen';
import { SignInScreen } from './sign-in-screen';
import { ThankYouScreen } from './thank-you-screen';
import { useCaptcha } from './use-captcha';
import type { Account } from '../api/account';
import { useSaveProfileMutation } from '../api/use-save-profile-mutation';
import { useSessionWriter } from '../api/use-session-writer';
import { useSignInMutation } from '../api/use-sign-in-mutation';
import { useSignUpMutation } from '../api/use-sign-up-mutation';

type Mode = 'sign-in' | 'create-account' | 'forgot-password';

interface AccountGateProps {
  /** The phone is signed in to an account whose name and number are not stored yet. */
  needsProfile: boolean;
}

/**
 * What a phone with no account sees: Sign in, with Create an account and Forgot password beside
 * it. An account whose name and number did not save sees only those two fields. A sign-up ends on
 * Thank you, held until Continue.
 */
export function AccountGate({ needsProfile }: AccountGateProps) {
  const [mode, setMode] = useState<Mode>('sign-in');
  // The account a sign-up just made: the page learns of it only on Thank you's Continue, so the
  // gate stays until then.
  const [madeAccount, setMadeAccount] = useState<Account | null>(null);
  const captcha = useCaptcha();
  const signIn = useSignInMutation();
  const signUp = useSignUpMutation();
  const saveProfile = useSaveProfileMutation();
  const writeSession = useSessionWriter();

  const switchTo = (next: Mode) => {
    signIn.reset();
    signUp.reset();
    setMode(next);
  };

  if (madeAccount) {
    return <ThankYouScreen onContinue={() => writeSession(madeAccount)} />;
  }

  if (needsProfile) {
    return (
      <ProfileStepScreen
        isBusy={saveProfile.isPending}
        error={messageOf(saveProfile.error ?? signUp.error)}
        onSubmit={(fields) => saveProfile.mutate(fields)}
      />
    );
  }

  return (
    <>
      {mode === 'sign-in' && (
        <SignInScreen
          isBusy={signIn.isPending}
          error={messageOf(signIn.error)}
          captcha={captcha}
          onSubmit={(fields) => signIn.mutate({ ...fields, captchaToken: captcha.takeToken() })}
          onCreateAccount={() => switchTo('create-account')}
          onForgotPassword={() => switchTo('forgot-password')}
        />
      )}
      {mode === 'create-account' && (
        <CreateAccountScreen
          isBusy={signUp.isPending}
          error={messageOf(signUp.error)}
          captcha={captcha}
          onSubmit={(fields) =>
            signUp.mutate(
              { ...fields, captchaToken: captcha.takeToken() },
              { onSuccess: setMadeAccount },
            )
          }
          onBack={() => switchTo('sign-in')}
        />
      )}
      {mode === 'forgot-password' && (
        <PasswordResetFlow captcha={captcha} onBack={() => switchTo('sign-in')} />
      )}
    </>
  );
}
