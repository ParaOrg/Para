/** The shortest password the project takes (Supabase Auth, "Minimum password length"). */
export const PASSWORD_MIN_LENGTH = 8;

/** Said under a new-password field. */
export const PASSWORD_RULE_HINT = 'At least 8 characters, with letters and numbers';

/** Said when a new password breaks the rule, before sending or as Supabase's `weak_password`. */
export const PASSWORD_RULE_ERROR = 'Use at least 8 characters, with letters and numbers';

/**
 * Whether a new password meets the project's rule (Supabase Auth's "Letters
 * and digits", minimum 8): checked before sending, so the editor hears it in
 * plain words rather than as Supabase's. Letters are a to z, either case, as
 * Supabase counts them.
 */
export function meetsPasswordRule(password: string): boolean {
  return (
    password.length >= PASSWORD_MIN_LENGTH && /[A-Za-z]/.test(password) && /[0-9]/.test(password)
  );
}

/** What to say for an error Supabase gave on setting a password: the rule for `weak_password`. */
export function setPasswordErrorMessage(error: { code?: string; message: string }): string {
  return error.code === 'weak_password' ? PASSWORD_RULE_ERROR : error.message;
}
