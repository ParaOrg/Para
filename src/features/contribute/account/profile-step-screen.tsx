import { useState } from 'react';

import { Button } from '@/design-system/primitives/button';
import { PhoneField } from '@/design-system/primitives/phone-field';
import { TextField } from '@/design-system/primitives/text-field';

import { checkProfile, type ProfileFields } from './account-fields';
import { AccountPage } from './account-page';

interface ProfileStepScreenProps {
  isBusy: boolean;
  /** One line about the last try, or null. */
  error: string | null;
  onSubmit: (fields: ProfileFields) => void;
}

/**
 * Create an account's last step, for an account whose name and number did not save: those two
 * fields, on the Create an account page's look (4461:646).
 */
export function ProfileStepScreen({ isBusy, error, onSubmit }: ProfileStepScreenProps) {
  const [fields, setFields] = useState<ProfileFields>({ name: '', phone: '' });
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof ProfileFields, string>>>({});

  const handleSubmit = () => {
    const checked = checkProfile(fields);
    setFieldErrors(checked.isValid ? {} : checked.errors);
    if (checked.isValid) onSubmit(checked.value);
  };

  return (
    <AccountPage
      title="Create an account"
      error={error}
      onSubmit={handleSubmit}
      actions={
        <Button
          type="submit"
          variant="primary"
          label={isBusy ? 'Saving…' : 'Continue'}
          disabled={isBusy}
        />
      }
    >
      <TextField
        label="Full name"
        autoComplete="name"
        value={fields.name}
        error={fieldErrors.name}
        onChange={(event) => setFields({ ...fields, name: event.target.value })}
      />
      <PhoneField
        label="Phone Number"
        autoComplete="tel-national"
        value={fields.phone}
        error={fieldErrors.phone}
        onChange={(event) => setFields({ ...fields, phone: event.target.value })}
      />
    </AccountPage>
  );
}
