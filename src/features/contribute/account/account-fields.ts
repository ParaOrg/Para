import * as z from 'zod/mini';

import { normalisePhoneNumber } from './phone-number';

// The shared zod chunk loads on the public page too, and its size counts against that page's
// budget: these checks use only what the chunk already holds (minLength and refine).
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const nameSchema = z.string().check(
  z.minLength(1, 'Enter your name'),
  z.refine((text) => text.length <= 80, 'Use 80 characters or fewer'),
);
const emailSchema = z.string().check(z.refine((text) => EMAIL.test(text), 'Enter a valid email'));
const phoneSchema = z
  .string()
  .check(
    z.refine(
      (text) => normalisePhoneNumber(text) !== null,
      'Enter a mobile number like 917 123 4567',
    ),
  );
/** The rule under a new password's field, always shown. */
export const PASSWORD_RULE = 'At least 8 characters, with letters and numbers';
const PASSWORD_RULE_ERROR = 'Use at least 8 characters, with letters and numbers';
// The project's "Letters and digits" setting: one of a-z or A-Z, and one of 0-9. It looks for
// those exact characters, so ñ or é is not a letter to it, and neither is a non-Latin digit.
const LETTER = /[A-Za-z]/;
const DIGIT = /[0-9]/;

// Supabase hashes with bcrypt, which reads no further than 72 bytes: a longer one is cut short.
const newPasswordSchema = z.string().check(
  z.minLength(8, PASSWORD_RULE_ERROR),
  z.refine((text) => text.length <= 72, 'Use 72 characters or fewer'),
  z.refine((text) => LETTER.test(text) && DIGIT.test(text), PASSWORD_RULE_ERROR),
);
const codeSchema = z
  .string()
  .check(z.refine((text) => /^[0-9]{6}$/.test(text), 'Enter the 6-digit code'));
const passwordSchema = z.string().check(z.minLength(1, 'Enter your password'));
const currentPasswordSchema = z.string().check(z.minLength(1, 'Enter your current password'));

export interface SignInFields {
  email: string;
  password: string;
}

export interface ForgotPasswordFields {
  email: string;
}

export interface CodeFields {
  code: string;
}

export interface NewPasswordFields {
  password: string;
  /** The password typed again: checked on the phone, never sent. */
  confirmation: string;
}

/** A password change from Account settings: the current password first, then the new one twice. */
export interface ChangePasswordFields extends NewPasswordFields {
  currentPassword: string;
}

export interface ProfileFields {
  name: string;
  phone: string;
}

export interface SignUpFields extends SignInFields, ProfileFields {}

type FieldErrors<TFields> = Partial<Record<keyof TFields, string>>;

export type Checked<TFields> =
  { isValid: true; value: TFields } | { isValid: false; errors: FieldErrors<TFields> };

/** The first message for one field, or nothing when it is fine. */
function problemOf(schema: z.ZodMiniType<string>, text: string): string | undefined {
  const result = schema.safeParse(text);
  return result.success ? undefined : result.error.issues[0]?.message;
}

function collect<TFields>(
  value: TFields,
  messages: Record<keyof TFields & string, string | undefined>,
): Checked<TFields> {
  const found = Object.entries(messages).flatMap(([key, message]) =>
    message ? [[key, message]] : [],
  );
  return found.length === 0
    ? { isValid: true, value }
    : { isValid: false, errors: Object.fromEntries(found) };
}

/** Sign-in's fields, trimmed. The password is not held to the sign-up minimum: an older one still signs in. */
export function checkSignIn(fields: SignInFields): Checked<SignInFields> {
  const value = { email: fields.email.trim(), password: fields.password };
  return collect(value, {
    email: problemOf(emailSchema, value.email),
    password: problemOf(passwordSchema, value.password),
  });
}

/** Create account's fields, trimmed, with the number in the form the database stores. */
export function checkSignUp(fields: SignUpFields): Checked<SignUpFields> {
  const trimmed = {
    name: fields.name.trim(),
    email: fields.email.trim(),
    phone: fields.phone.trim(),
    password: fields.password,
  };
  const phone = normalisePhoneNumber(trimmed.phone);
  return collect(
    { ...trimmed, phone: phone ?? trimmed.phone },
    {
      name: problemOf(nameSchema, trimmed.name),
      email: problemOf(emailSchema, trimmed.email),
      phone: problemOf(phoneSchema, trimmed.phone),
      password: problemOf(newPasswordSchema, trimmed.password),
    },
  );
}

/** The name and number alone: what is left of Create account once its email and password are set. */
export function checkProfile(fields: ProfileFields): Checked<ProfileFields> {
  const name = fields.name.trim();
  const phone = fields.phone.trim();
  return collect(
    { name, phone: normalisePhoneNumber(phone) ?? phone },
    { name: problemOf(nameSchema, name), phone: problemOf(phoneSchema, phone) },
  );
}

/** The email a code is sent to, trimmed. */
export function checkForgotPassword(fields: ForgotPasswordFields): Checked<ForgotPasswordFields> {
  const email = fields.email.trim();
  return collect({ email }, { email: problemOf(emailSchema, email) });
}

/** The emailed code, with any spaces a person types or pastes taken out. */
export function checkCode(fields: CodeFields): Checked<CodeFields> {
  const code = fields.code.replace(/\s/g, '');
  return collect({ code }, { code: problemOf(codeSchema, code) });
}

/** The new password, and the same password typed again. */
export function checkNewPassword(fields: NewPasswordFields): Checked<NewPasswordFields> {
  return collect(fields, {
    password: problemOf(newPasswordSchema, fields.password),
    confirmation: fields.confirmation === fields.password ? undefined : "The passwords don't match",
  });
}

/** The current password, given at all, and the new one held to the reset's rules. */
export function checkChangePassword(fields: ChangePasswordFields): Checked<ChangePasswordFields> {
  return collect(fields, {
    currentPassword: problemOf(currentPasswordSchema, fields.currentPassword),
    password: problemOf(newPasswordSchema, fields.password),
    confirmation: fields.confirmation === fields.password ? undefined : "The passwords don't match",
  });
}
