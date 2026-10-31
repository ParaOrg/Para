import { useId, useState, type ComponentPropsWithoutRef, type Ref } from 'react';

import { FieldError } from './field-error';
import { describedBy } from './field-frame';

const CODE_LENGTH = 6;
/** The dash sits after the third box. */
const FIRST_GROUP = [0, 1, 2];
const SECOND_GROUP = [3, 4, 5];

interface OtpFieldProps extends Omit<
  ComponentPropsWithoutRef<'input'>,
  | 'className'
  | 'style'
  | 'type'
  | 'children'
  | 'dangerouslySetInnerHTML'
  | 'value'
  | 'onChange'
  | 'maxLength'
  | 'aria-invalid'
> {
  /** The field's accessible name: Figma draws no label, the screen's text says what it is. */
  label: string;
  /** The digits typed so far, at most six. */
  value: string;
  /** Called with the digits only: anything else typed or pasted is dropped. */
  onChange: (code: string) => void;
  /** The message under the boxes, the boxes in InputField's error colours; read out as it shows. */
  error?: string;
  /**
   * Set while a code is refused: a new value shakes the boxes once (no shake with reduced
   * motion), and the next digit typed starts the code again from that digit. Unset, neither.
   */
  shakeKey?: number;
  ref?: Ref<HTMLInputElement>;
}

type BoxState = 'rest' | 'active' | 'error' | 'active-error' | 'disabled';

/**
 * OTPFieldItem's looks (Figma 4461:5306): Rest and Blank share the grey box, Active is the box
 * the next digit goes in. Error and disabled are InputField's (4295:20567): Figma draws neither
 * for the code. Active's border is 2, as Figma draws it; the border is always there, clear at
 * rest, so turning Active moves nothing.
 */
const BOX = {
  rest: 'border-transparent bg-surface-secondary text-content-primary',
  active: 'border-brand-surface bg-surface-secondary text-content-primary',
  error: 'border-error-surface bg-surface-error text-content-primary',
  // As InputField does: focused, the error box takes Active's border and keeps its fill.
  'active-error': 'border-brand-surface bg-surface-error text-content-primary',
  disabled: 'border-transparent bg-surface-tertiary text-content-disabled',
} satisfies Record<BoxState, string>;

/**
 * Digits only, at most six: what a paste of "123 456" or "Code: 123456" leaves. The input has no
 * maxLength, which would cut a paste short before the digits are picked out of it.
 */
function codeDigits(text: string): string {
  return text.replace(/\D/g, '').slice(0, CODE_LENGTH);
}

/**
 * PalimosPoDesignSystem's OTPFIeld (Figma 4461:5363): six boxes, a dash after the third. One
 * real input lies over the boxes, so a paste fills them all, the phone offers the texted code
 * (autocomplete one-time-code) and a screen reader reads one field, not six.
 */
export function OtpField({
  label,
  value,
  onChange,
  error,
  shakeKey,
  disabled = false,
  id,
  'aria-describedby': ownDescription,
  onFocus,
  onBlur,
  onPaste,
  ref,
  ...input
}: OtpFieldProps) {
  const ownId = useId();
  const fieldId = id ?? ownId;
  const errorId = `${fieldId}-error`;
  const isErrorShown = !!error && !disabled;
  const [isFocused, setIsFocused] = useState(false);
  const digits = codeDigits(value);
  const activeIndex = Math.min(digits.length, CODE_LENGTH - 1);

  const boxState = (index: number): BoxState => {
    if (disabled) return 'disabled';
    const isActive = isFocused && index === activeIndex;
    if (isErrorShown) return isActive ? 'active-error' : 'error';
    return isActive ? 'active' : 'rest';
  };

  const renderBox = (index: number) => (
    <span
      key={index}
      className={
        'flex h-11 min-w-0 flex-1 items-center justify-center rounded-xl border-2 text-lg/7 font-semibold ' +
        BOX[boxState(index)]
      }
    >
      {digits[index]}
    </span>
  );

  return (
    <div className="flex w-full flex-col font-sn-pro">
      <div className="relative w-full">
        {/* A new key restarts the shake; the input below keeps its focus. */}
        <div
          key={shakeKey}
          aria-hidden
          className={
            'flex w-full items-center gap-3' +
            (shakeKey === undefined ? '' : ' motion-safe:animate-shake')
          }
        >
          <div className="flex min-w-0 flex-1 gap-2">{FIRST_GROUP.map(renderBox)}</div>
          <span className="text-base/6 font-bold text-content-primary">-</span>
          <div className="flex min-w-0 flex-1 gap-2">{SECOND_GROUP.map(renderBox)}</div>
        </div>
        <input
          {...input}
          ref={ref}
          id={fieldId}
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]*"
          aria-label={label}
          value={digits}
          disabled={disabled}
          aria-invalid={isErrorShown || undefined}
          aria-describedby={describedBy(ownDescription, isErrorShown ? errorId : undefined)}
          onChange={(event) => {
            const typed = event.target.value.replace(/\D/g, '');
            // The caret is held at the end, so what was added is what follows the old digits.
            const isAdded = typed.length > digits.length && typed.startsWith(digits);
            const isRefused = isErrorShown && shakeKey !== undefined;
            onChange(codeDigits(isRefused && isAdded ? typed.slice(digits.length) : typed));
          }}
          // A paste replaces the whole code, wherever the caret is: a new code pasted over an old
          // one, or over a few typed digits, would otherwise be cut back to the first six.
          onPaste={(event) => {
            const pasted = codeDigits(event.clipboardData.getData('text'));
            if (pasted) {
              event.preventDefault();
              onChange(pasted);
            }
            onPaste?.(event);
          }}
          // The caret stays at the end, so what is typed goes in the Active box, wherever the
          // boxes were tapped.
          onSelect={(event) => {
            const field = event.currentTarget;
            const end = field.value.length;
            if (field.selectionStart !== end || field.selectionEnd !== end) {
              field.setSelectionRange(end, end);
            }
          }}
          onFocus={(event) => {
            setIsFocused(true);
            onFocus?.(event);
          }}
          onBlur={(event) => {
            setIsFocused(false);
            onBlur?.(event);
          }}
          className="absolute inset-0 size-full cursor-text bg-transparent text-transparent caret-transparent opacity-0 outline-none disabled:cursor-not-allowed"
        />
      </div>
      {/* Read out as it appears: a code is often checked with no button pressed. */}
      {isErrorShown && (
        <div role="alert" className="pt-1.5">
          <FieldError id={errorId} message={error} />
        </div>
      )}
    </div>
  );
}
