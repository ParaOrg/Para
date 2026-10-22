import { useId, useRef, type ComponentPropsWithoutRef, type ReactNode, type Ref } from 'react';

import { FIELD_CONTROL, FIELD_TRAILING_BUTTON, FieldFrame, describedBy } from './field-frame';
import { ClearIcon } from './field-icons';

type TextFieldProps = Omit<
  ComponentPropsWithoutRef<'input'>,
  'className' | 'style' | 'type' | 'children' | 'dangerouslySetInnerHTML' | 'value' | 'aria-invalid'
> & {
  /** Figma's ✏️ Label. */
  label: ReactNode;
  value: string;
  type?: 'text' | 'email' | 'tel' | 'url';
  /** Figma's Variant3: the message shown under the field. */
  error?: string;
  /**
   * Figma's Close icon: shown while the field holds something, a press empties it (the caller
   * sets the value to '') and puts the caret back in it. Without it, the field has no icon.
   */
  onClear?: () => void;
  ref?: Ref<HTMLInputElement>;
};

/**
 * PalimosPoDesignSystem's InputField (Figma 4295:20567), the general field: a label over a
 * 44-tall box, Active while it has focus, and an inline error under it.
 */
export function TextField({
  label,
  type = 'text',
  error,
  onClear,
  disabled = false,
  id,
  'aria-describedby': ownDescription,
  ref,
  ...input
}: TextFieldProps) {
  const ownId = useId();
  const fieldId = id ?? ownId;
  const errorId = `${fieldId}-error`;
  const isErrorShown = !!error && !disabled;
  const inputRef = useRef<HTMLInputElement | null>(null);
  const setRef = (node: HTMLInputElement | null) => {
    inputRef.current = node;
    if (typeof ref === 'function') ref(node);
    else if (ref) ref.current = node;
  };
  const canClear = !!onClear && !disabled && input.value !== '';

  return (
    <FieldFrame
      id={fieldId}
      label={label}
      error={error}
      errorId={errorId}
      isDisabled={disabled}
      trailing={
        canClear && (
          <button
            type="button"
            aria-label="Clear"
            title="Clear"
            onClick={() => {
              onClear();
              inputRef.current?.focus();
            }}
            className={FIELD_TRAILING_BUTTON}
          >
            <span aria-hidden className="size-6 *:size-full">
              <ClearIcon />
            </span>
          </button>
        )
      }
    >
      <input
        {...input}
        ref={setRef}
        id={fieldId}
        type={type}
        disabled={disabled}
        aria-invalid={isErrorShown || undefined}
        aria-describedby={describedBy(ownDescription, isErrorShown ? errorId : undefined)}
        className={FIELD_CONTROL + (canClear ? '' : ' pr-3')}
      />
    </FieldFrame>
  );
}
