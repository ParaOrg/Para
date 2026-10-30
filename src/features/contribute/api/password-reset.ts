import { accountOf, hasProfileOf, type Account } from './account';
import { accountErrorOf, authError } from './account-errors';
import { AccountError } from './account-problem';
import { aroundEarlierIdentity } from './earlier-identity';
import { requireClient } from './require-client';

export interface PasswordCodeInput {
  email: string;
  captchaToken?: string;
}

export interface VerifyPasswordCodeInput {
  email: string;
  /** The 6 digits from the email. */
  code: string;
}

export interface NewPasswordInput {
  password: string;
}

/**
 * Emails a 6-digit code that resets the password. Always the same answer for an address with an
 * account and one without: the page never says which it is.
 */
export async function requestPasswordCode(input: PasswordCodeInput): Promise<void> {
  try {
    const client = await requireClient();
    const { error } = await client.auth.resetPasswordForEmail(input.email, {
      captchaToken: input.captchaToken,
    });
    // The cool-down answers only for an address that has an account: said as a send, it gives
    // nothing away.
    if (error && error.code !== 'over_email_send_rate_limit') throw authError(error);
  } catch (error) {
    throw accountErrorOf(error);
  }
}

/**
 * Signs in with the emailed code: the same end state as `signIn`, the phone's own earlier uploads
 * claimed included. The password is set after, by `setNewPassword`.
 */
export async function verifyPasswordCode(input: VerifyPasswordCodeInput): Promise<Account> {
  try {
    const client = await requireClient();
    const { data, error } = await aroundEarlierIdentity(client, () =>
      client.auth.verifyOtp({ email: input.email, token: input.code, type: 'recovery' }),
    );
    if (error) throw authError(error);
    const account = accountOf(data.user, await hasProfileOf(client));
    if (!account) throw new AccountError('not-accepting', 'The account has no email.');
    return account;
  } catch (error) {
    throw accountErrorOf(error);
  }
}

/** Sets the signed-in account's password: the last step of a reset, after the code signed in. */
export async function setNewPassword(input: NewPasswordInput): Promise<void> {
  try {
    const client = await requireClient();
    const { error } = await client.auth.updateUser({ password: input.password });
    if (error) throw authError(error);
  } catch (error) {
    throw accountErrorOf(error);
  }
}
