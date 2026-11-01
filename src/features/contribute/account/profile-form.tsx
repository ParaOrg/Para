import { useRef, useState } from 'react';
import { flushSync } from 'react-dom';

import { PhoneField } from '@/design-system/primitives/phone-field';
import { TextField } from '@/design-system/primitives/text-field';

import { checkProfile, type ProfileFields } from './account-fields';
import { normalisePhoneNumber, numberAfterCountryCode } from './phone-number';
import { SaveChangesSheet } from './save-changes-sheet';

interface ProfileFormProps {
  /** The stored name and number the fields start from. */
  profile: ProfileFields;
  isBusy: boolean;
  /** One line about the last try, or null. */
  error: string | null;
  onSubmit: (fields: ProfileFields) => void;
}

const FORM_ID = 'profile-form';

type FieldErrors = Partial<Record<keyof ProfileFields, string>>;

/**
 * Account settings' name and number (Figma 4540:4821). Once either differs from what is stored,
 * the Save changes sheet rises; Cancel puts back what is stored and lowers it.
 */
export function ProfileForm({ profile, isBusy, error, onSubmit }: ProfileFormProps) {
  const stored = { name: profile.name, phone: numberAfterCountryCode(profile.phone) };
  const [fields, setFields] = useState<ProfileFields>(stored);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const typedPhone = fields.phone.trim();
  const isChanged =
    fields.name.trim() !== profile.name ||
    (normalisePhoneNumber(typedPhone) ?? typedPhone) !== profile.phone;

  const handleSubmit = () => {
    const checked = checkProfile(fields);
    setFieldErrors(checked.isValid ? {} : checked.errors);
    if (checked.isValid) onSubmit(checked.value);
  };
  const formRef = useRef<HTMLFormElement>(null);
  // The sheet goes with Cancel: focus, which was on it, goes back to the name.
  const handleCancel = () => {
    flushSync(() => {
      setFields(stored);
      setFieldErrors({});
    });
    formRef.current?.querySelector('input')?.focus();
  };

  return (
    <>
      <form
        ref={formRef}
        id={FORM_ID}
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          handleSubmit();
        }}
        className="flex flex-col gap-5"
      >
        <TextField
          label="Name"
          autoComplete="name"
          value={fields.name}
          error={fieldErrors.name}
          onChange={(event) => setFields({ ...fields, name: event.target.value })}
        />
        <PhoneField
          label="Phone number"
          value={fields.phone}
          error={fieldErrors.phone}
          onChange={(event) => setFields({ ...fields, phone: event.target.value })}
        />
      </form>
      {(isChanged || isBusy) && (
        <SaveChangesSheet formId={FORM_ID} isBusy={isBusy} error={error} onCancel={handleCancel} />
      )}
    </>
  );
}
