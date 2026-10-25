import { useState } from 'react';

import { Button } from '@/design-system/primitives/button';
import { TextField } from '@/design-system/primitives/text-field';

import { checkProfile, type ProfileFields } from './account-fields';
import { AccountPanel } from './account-panel';

interface ProfileStepScreenProps {
  isBusy: boolean;
  /** One line about the last try, or null. */
  error: string | null;
  onSubmit: (fields: ProfileFields) => void;
}

/** Create account's last step, for an account whose name and number did not save: those two fields. */
export function ProfileStepScreen({ isBusy, error, onSubmit }: ProfileStepScreenProps) {
  const [fields, setFields] = useState<ProfileFields>({ name: '', phone: '' });
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof ProfileFields, string>>>({});

  const handleSubmit = () => {
    const checked = checkProfile(fields);
    setFieldErrors(checked.isValid ? {} : checked.errors);
    if (checked.isValid) onSubmit(checked.value);
  };

  return (
    <AccountPanel
      title="Create account"
      error={error}
      onSubmit={handleSubmit}
      actions={
        <Button
          type="submit"
          variant="primary"
          label={isBusy ? 'Saving…' : 'Save'}
          disabled={isBusy}
        />
      }
    >
      <TextField
        label="Name"
        autoComplete="name"
        value={fields.name}
        error={fieldErrors.name}
        onChange={(event) => setFields({ ...fields, name: event.target.value })}
      />
      <TextField
        label="Number"
        type="tel"
        autoComplete="tel"
        value={fields.phone}
        error={fieldErrors.phone}
        onChange={(event) => setFields({ ...fields, phone: event.target.value })}
      />
    </AccountPanel>
  );
}
