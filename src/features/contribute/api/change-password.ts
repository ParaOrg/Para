import { accountErrorOf, authError } from './account-errors';
import { AccountError } from './account-problem';
import { requireClient } from './require-client';

export interface ChangePasswordInput {
  /** The account's email, which the current password is checked against. */
  email: string;
  currentPassword: string;
  newPassword: string;
  captchaToken?: string;
}

/**
 * Changes the signed-in account's password from Account settings. The current password is checked
 * first, by signing in with it again: a phone left unlocked cannot change the password, and the
 * fresh sign-in is the recent one Para's secure password change asks for.
 */
export async function changePassword(input: ChangePasswordInput): Promise<void> {
  try {
    const client = await requireClient();
    const checked = await client.auth.signInWithPassword({
      email: input.email,
      password: input.currentPassword,
      options: input.captchaToken ? { captchaToken: input.captchaToken } : undefined,
    });
    if (checked.error?.code === 'invalid_credentials') {
      throw new AccountError('wrong-current-password', checked.error.message);
    }
    if (checked.error) throw authError(checked.error);
    const { error } = await client.auth.updateUser({ password: input.newPassword });
    if (error) throw authError(error);
  } catch (error) {
    throw accountErrorOf(error);
  }
}
