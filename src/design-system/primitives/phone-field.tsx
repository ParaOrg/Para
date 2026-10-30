import { useId, type ComponentPropsWithoutRef, type ReactNode, type Ref } from 'react';

import { FIELD_BOX, FIELD_CONTROL, FieldError, describedBy, type FieldState } from './field-frame';
import philippineFlag from './philippine-flag.svg';

type PhoneFieldProps = Omit<
  ComponentPropsWithoutRef<'input'>,
  'className' | 'style' | 'type' | 'children' | 'dangerouslySetInnerHTML' | 'value' | 'aria-invalid'
> & {
  /** Figma's label over the boxes. */
  label: ReactNode;
  /** The number after +63, as typed. */
  value: string;
  /** The message under the boxes, the boxes in InputField's error colours. */
  error?: string;
  ref?: Ref<HTMLInputElement>;
};

/**
 * PalimosPoDesignSystem's PhoneField (Figma 4461:2762): the label, then two boxes 2 apart, the
 * flag and +63 in an 80-wide box and the number in the rest. Focus, error and disabled are
 * InputField's (4295:20567); focus borders the number box, the one being typed in.
 */
export function PhoneField({
  label,
  error,
  disabled = false,
  id,
  placeholder = '98X XXX XXXX',
  'aria-describedby': ownDescription,
  ref,
  ...input
}: PhoneFieldProps) {
  const ownId = useId();
  const fieldId = id ?? ownId;
  const errorId = `${fieldId}-error`;
  const prefixId = `${fieldId}-prefix`;
  const isErrorShown = !!error && !disabled;
  const state: FieldState = disabled ? 'disabled' : isErrorShown ? 'error' : 'default';

  return (
    <div className="flex w-full flex-col gap-1.5 font-sn-pro">
      <label htmlFor={fieldId} className="text-sm/5 text-content-quaternary">
        {label}
      </label>
      <div className="flex w-full gap-0.5">
        <div
          className={
            'flex h-11 w-20 shrink-0 items-center gap-1 rounded-l-xl border px-3 ' +
            FIELD_BOX[state]
          }
        >
          <img src={philippineFlag} alt="" className="size-4 shrink-0" />
          <span id={prefixId} className="text-base-lower/6">
            +63
          </span>
        </div>
        <div
          className={
            'flex h-11 min-w-0 flex-1 items-center rounded-r-xl border ' + FIELD_BOX[state]
          }
        >
          <input
            {...input}
            ref={ref}
            id={fieldId}
            type="tel"
            inputMode="tel"
            placeholder={placeholder}
            disabled={disabled}
            aria-invalid={isErrorShown || undefined}
            aria-describedby={describedBy(
              describedBy(prefixId, ownDescription),
              isErrorShown ? errorId : undefined,
            )}
            className={FIELD_CONTROL + ' pr-3'}
          />
        </div>
      </div>
      {isErrorShown && <FieldError id={errorId} message={error} />}
    </div>
  );
}
