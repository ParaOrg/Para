import { useId, type ComponentProps } from 'react';

import { PasswordField } from '@/design-system/primitives/password-field';

import { PASSWORD_RULE } from './account-fields';

type NewPasswordFieldProps = Omit<ComponentProps<typeof PasswordField>, 'autoComplete'>;

/**
 * A password being chosen: PasswordField with the project's rule always under it, so the rule is
 * read before the first try. Figma's InputField draws no helper line; this is the error line's
 * size, in the muted colour.
 */
export function NewPasswordField({
  'aria-describedby': ownDescription,
  ...field
}: NewPasswordFieldProps) {
  const ruleId = useId();
  return (
    <div className="flex w-full flex-col gap-1.5">
      <PasswordField
        {...field}
        autoComplete="new-password"
        aria-describedby={ownDescription ? `${ownDescription} ${ruleId}` : ruleId}
      />
      <p id={ruleId} className="font-sn-pro text-sm/5 text-content-tertiary">
        {PASSWORD_RULE}
      </p>
    </div>
  );
}
