import { useState } from 'react';

import { ACCOUNT_MESSAGES, AccountError } from '../api/account-problem';
import { useSignInMutation } from '../api/use-sign-in-mutation';
import { useSignUpMutation } from '../api/use-sign-up-mutation';
import { BackToMapButton } from '../back-to-map-button';
import { CreateAccountScreen } from './create-account-screen';
import { SignInScreen } from './sign-in-screen';
import { useCaptcha } from './use-captcha';

type Mode = 'sign-in' | 'create-account';

/** The one line to show for a failed request; one the page does not know is ParaPo not accepting it. */
function messageOf(error: Error | null): string | null {
  if (!error) return null;
  if (error instanceof AccountError) return ACCOUNT_MESSAGES[error.problem];
  console.error('An account request failed.', error);
  return ACCOUNT_MESSAGES['not-accepting'];
}

/** What a phone with no account sees: Sign in, with Create account beside it, and the way back to the map. */
export function AccountGate() {
  const [mode, setMode] = useState<Mode>('sign-in');
  const captcha = useCaptcha();
  const signIn = useSignInMutation();
  const signUp = useSignUpMutation();

  const switchTo = (next: Mode) => {
    signIn.reset();
    signUp.reset();
    setMode(next);
  };

  return (
    <>
      <BackToMapButton />
      {mode === 'sign-in' ? (
        <SignInScreen
          isBusy={signIn.isPending}
          error={messageOf(signIn.error)}
          captcha={captcha}
          onSubmit={(fields) => signIn.mutate({ ...fields, captchaToken: captcha.takeToken() })}
          onCreateAccount={() => switchTo('create-account')}
        />
      ) : (
        <CreateAccountScreen
          isBusy={signUp.isPending}
          error={messageOf(signUp.error)}
          captcha={captcha}
          onSubmit={(fields) => signUp.mutate({ ...fields, captchaToken: captcha.takeToken() })}
          onSignIn={() => switchTo('sign-in')}
        />
      )}
    </>
  );
}
