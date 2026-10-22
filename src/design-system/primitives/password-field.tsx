import { useId, useState, type ComponentPropsWithoutRef, type ReactNode } from 'react';

import { FIELD_CONTROL, FIELD_TRAILING_BUTTON, FieldFrame, describedBy } from './field-frame';
import { EyeClosedIcon, EyeOpenIcon } from './field-icons';

type PasswordFieldProps = Omit<
  ComponentPropsWithoutRef<'input'>,
  'className' | 'style' | 'type' | 'children' | 'dangerouslySetInnerHTML' | 'value' | 'aria-invalid'
> & {
  /** Figma's ✏️ Label. */
  label: ReactNode;
  value: string;
  /** Figma's Variant3: the message shown under the field. */
  error?: string;
};

/**
 * The InputField (Figma 4295:20567) for a password: eye-open while it is hidden, a press shows
 * it and turns the eye to eye-closed, a second hides it again.
 */
export function PasswordField({
  label,
  error,
  disabled = false,
  id,
  'aria-describedby': ownDescription,
  ...input
}: PasswordFieldProps) {
  const ownId = useId();
  const fieldId = id ?? ownId;
  const errorId = `${fieldId}-error`;
  const isErrorShown = !!error && !disabled;
  const [isShown, setIsShown] = useState(false);

  return (
    <FieldFrame
      id={fieldId}
      label={label}
      error={error}
      errorId={errorId}
      isDisabled={disabled}
      trailing={
        <button
          type="button"
          aria-label={isShown ? 'Hide password' : 'Show password'}
          title={isShown ? 'Hide password' : 'Show password'}
          aria-controls={fieldId}
          disabled={disabled}
          onClick={() => setIsShown((shown) => !shown)}
          className={FIELD_TRAILING_BUTTON}
        >
          <span aria-hidden className="size-6 *:size-full">
            {isShown ? <EyeClosedIcon /> : <EyeOpenIcon />}
          </span>
        </button>
      }
    >
      <input
        {...input}
        id={fieldId}
        type={isShown ? 'text' : 'password'}
        disabled={disabled}
        aria-invalid={isErrorShown || undefined}
        aria-describedby={describedBy(ownDescription, isErrorShown ? errorId : undefined)}
        className={FIELD_CONTROL}
      />
    </FieldFrame>
  );
}
