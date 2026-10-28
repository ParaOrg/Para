import { accountOf, hasProfileOf, type Account } from './account';
import { accountErrorOf, authError } from './account-errors';
import { AccountError } from './account-problem';
import { aroundEarlierIdentity } from './earlier-identity';
import { requireClient } from './require-client';

export interface PasswordCodeInput {
  email: string;
  captchaToken?: string;
}

export interface ResetPasswordInput {
  email: string;
  /** The 6 digits from the email. */
  code: string;
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
 * Signs in with the emailed code, then sets the new password: the same end state as `signIn`,
 * the phone's own earlier uploads claimed included. If only setting the password fails, the code
 * is spent, so the phone is signed out again and the person asks for a new one.
 */
export async function resetPassword(input: ResetPasswordInput): Promise<Account> {
  try {
    const client = await requireClient();
    const after: { passwordError: Parameters<typeof authError>[0] | null } = {
      passwordError: null,
    };
    const { data, error } = await aroundEarlierIdentity(client, async () => {
      const verified = await client.auth.verifyOtp({
        email: input.email,
        token: input.code,
        type: 'recovery',
      });
      if (verified.error) return verified;
      // Kept for after the claim: failing here would drop it, and the earlier uploads with it.
      try {
        after.passwordError = (await client.auth.updateUser({ password: input.password })).error;
      } catch (thrown) {
        after.passwordError = {
          name: thrown instanceof Error ? thrown.name : 'Error',
          message: String(thrown),
        };
      }
      return verified;
    });
    if (error) throw authError(error);
    if (after.passwordError) {
      await client.auth.signOut({ scope: 'local' });
      throw authError(after.passwordError);
    }
    const account = accountOf(data.user, await hasProfileOf(client));
    if (!account) throw new AccountError('not-accepting', 'The account has no email.');
    return account;
  } catch (error) {
    throw accountErrorOf(error);
  }
}
