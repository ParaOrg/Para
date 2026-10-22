import { useId, type ComponentPropsWithoutRef, type ReactNode } from 'react';

import { FIELD_CONTROL, FieldFrame, describedBy } from './field-frame';

type TextAreaFieldProps = Omit<
  ComponentPropsWithoutRef<'textarea'>,
  'className' | 'style' | 'children' | 'dangerouslySetInnerHTML' | 'value' | 'aria-invalid'
> & {
  /** Figma's ✏️ Label. */
  label: ReactNode;
  value: string;
  /** Figma's Variant3: the message shown under the field. */
  error?: string;
};

/**
 * The InputField (Figma 4295:20567) for several lines: the same label, box, states and error,
 * the box as tall as its rows. It has no icon.
 */
export function TextAreaField({
  label,
  error,
  disabled = false,
  id,
  rows = 3,
  'aria-describedby': ownDescription,
  ...textarea
}: TextAreaFieldProps) {
  const ownId = useId();
  const fieldId = id ?? ownId;
  const errorId = `${fieldId}-error`;
  const isErrorShown = !!error && !disabled;

  return (
    <FieldFrame
      id={fieldId}
      label={label}
      error={error}
      errorId={errorId}
      isDisabled={disabled}
      isMultiline
    >
      <textarea
        {...textarea}
        id={fieldId}
        rows={rows}
        disabled={disabled}
        aria-invalid={isErrorShown || undefined}
        aria-describedby={describedBy(ownDescription, isErrorShown ? errorId : undefined)}
        className={FIELD_CONTROL + ' resize-none pr-3'}
      />
    </FieldFrame>
  );
}
