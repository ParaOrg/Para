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
      'Enter a mobile number like 09171234567',
    ),
  );
const newPasswordSchema = z.string().check(z.minLength(8, 'Use at least 8 characters'));
const passwordSchema = z.string().check(z.minLength(1, 'Enter your password'));

export interface SignInFields {
  email: string;
  password: string;
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
