import { accountOf, hasProfileOf, type Account } from './account';
import { accountErrorOf, authError } from './account-errors';
import { AccountError } from './account-problem';
import { aroundEarlierIdentity } from './earlier-identity';
import { requireClient } from './require-client';

export interface SignInInput {
  email: string;
  password: string;
  captchaToken?: string;
}

/** Signs in to an account made on this or another phone. */
export async function signIn(input: SignInInput): Promise<Account> {
  try {
    const client = await requireClient();
    const { data, error } = await aroundEarlierIdentity(client, () =>
      client.auth.signInWithPassword({
        email: input.email,
        password: input.password,
        options: input.captchaToken ? { captchaToken: input.captchaToken } : undefined,
      }),
    );
    if (error) throw authError(error);
    const account = accountOf(data.user, await hasProfileOf(client));
    if (!account) throw new AccountError('not-accepting', 'The account has no email.');
    return account;
  } catch (error) {
    throw accountErrorOf(error);
  }
}
