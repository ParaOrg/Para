import { useId, type ComponentPropsWithoutRef, type ReactNode, type Ref } from 'react';

import { FIELD_CONTROL, FIELD_TRAILING, FieldFrame, describedBy } from './field-frame';
import { ChevronDownIcon } from './field-icons';

type SelectFieldProps = Omit<
  ComponentPropsWithoutRef<'select'>,
  'className' | 'style' | 'dangerouslySetInnerHTML' | 'multiple' | 'aria-invalid'
> & {
  /** Figma's ✏️ Label. */
  label: ReactNode;
  /** The options, as <option>s. */
  children: ReactNode;
  /** Figma's Variant3: the message shown under the field. */
  error?: string;
  ref?: Ref<HTMLSelectElement>;
};

/**
 * The InputField (Figma 4295:20567) as a dropdown, with its chevron-down. The phone's own
 * picker opens it, so it reads and works as a native select; the chevron is drawn over its right
 * end and lets taps through.
 */
export function SelectField({
  label,
  children,
  error,
  disabled = false,
  id,
  'aria-describedby': ownDescription,
  ref,
  ...select
}: SelectFieldProps) {
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
      trailing={
        <span
          aria-hidden
          className={FIELD_TRAILING + ' pointer-events-none absolute inset-y-0 right-0'}
        >
          <span className="size-6 *:size-full">
            <ChevronDownIcon />
          </span>
        </span>
      }
    >
      <select
        {...select}
        ref={ref}
        id={fieldId}
        disabled={disabled}
        aria-invalid={isErrorShown || undefined}
        aria-describedby={describedBy(ownDescription, isErrorShown ? errorId : undefined)}
        className={FIELD_CONTROL + ' w-full cursor-pointer appearance-none truncate pr-11'}
      >
        {children}
      </select>
    </FieldFrame>
  );
}
