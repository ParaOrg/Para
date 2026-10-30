const LOCAL_MOBILE = /^09\d{9}$/;
const INTERNATIONAL_MOBILE = /^\+639\d{9}$/;
/** What PhoneField takes: the number after its +63, 9XXXXXXXXX. */
const AFTER_COUNTRY_CODE = /^9\d{9}$/;

/**
 * A Philippine mobile number in the form the database stores, +639XXXXXXXXX, or null when the
 * text is not one. Takes 9XXXXXXXXX (typed after PhoneField's +63), 09XXXXXXXXX or
 * +639XXXXXXXXX; spaces, dashes and brackets are ignored.
 */
export function normalisePhoneNumber(text: string): string | null {
  const digits = text.replace(/[\s\-()]/g, '');
  if (AFTER_COUNTRY_CODE.test(digits)) return `+63${digits}`;
  if (LOCAL_MOBILE.test(digits)) return `+63${digits.slice(1)}`;
  return INTERNATIONAL_MOBILE.test(digits) ? digits : null;
}
