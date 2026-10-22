import type { ReactNode } from 'react';

import { AlertCircleIcon } from './field-icons';

type FieldState = 'default' | 'error' | 'disabled';

interface FieldFrameProps {
  /** The control's id: the label points at it. */
  id: string;
  /** Figma's ✏️ Label. A node, so a field can add a muted note after its name. */
  label: ReactNode;
  /** Figma's Property 1=Variant3: the message under the box, the box in error colours. */
  error?: string;
  /** The id the control's aria-describedby names, so a screen reader reads the error with it. */
  errorId: string;
  isDisabled: boolean;
  /** A textarea's box: the same look, grown to its rows instead of 44 tall. */
  isMultiline?: boolean;
  /** The input or select, filling the box. */
  children: ReactNode;
  /** Figma's 🙏 Icon Instance: the eye, the clear, the chevron; none for a bare field. */
  trailing?: ReactNode;
}

/**
 * The box each state draws (Figma's InputField, 4295:20567). Active is not a prop: it is the box
 * holding focus, a Brand/surface border; at rest the border is there but clear, so focusing moves
 * nothing.
 */
const BOX = {
  default:
    'border-transparent bg-surface-secondary text-content-primary focus-within:border-brand-surface',
  // Focused, the error box takes Active's border: Figma draws no focused error state yet.
  error:
    'border-error-surface bg-surface-error text-content-primary focus-within:border-brand-surface',
  disabled: 'border-transparent bg-surface-tertiary text-content-disabled',
} satisfies Record<FieldState, string>;

const HEIGHT = {
  single: 'h-11 items-center',
  multiline: 'items-start',
} satisfies Record<'single' | 'multiline', string>;

/**
 * PalimosPoDesignSystem's InputField frame (Figma 4295:20567): the label, the 44-tall box with the
 * control and its trailing icon, and an inline error under it. TextField, PasswordField and
 * SelectField are this frame around their control.
 */
export function FieldFrame({
  id,
  label,
  error,
  errorId,
  isDisabled,
  isMultiline = false,
  children,
  trailing,
}: FieldFrameProps) {
  const state: FieldState = isDisabled ? 'disabled' : error ? 'error' : 'default';
  return (
    <div className="flex w-full flex-col gap-1.5 font-sn-pro">
      <label htmlFor={id} className="text-sm/5 text-content-quaternary">
        {label}
      </label>
      <div
        className={
          'relative flex w-full rounded-xl border ' +
          HEIGHT[isMultiline ? 'multiline' : 'single'] +
          ' ' +
          BOX[state]
        }
      >
        {children}
        {trailing}
      </div>
      {error && !isDisabled && (
        <p id={errorId} className="flex items-center gap-1.5 text-sm/5 text-content-error">
          <span aria-hidden className="size-5 shrink-0 *:size-full">
            <AlertCircleIcon />
          </span>
          {error}
        </p>
      )}
    </div>
  );
}

/**
 * The control's aria-describedby: the caller's own description, then the error while it shows.
 */
export function describedBy(
  own: string | undefined,
  errorId: string | undefined,
): string | undefined {
  return [own, errorId].filter(Boolean).join(' ') || undefined;
}

/** The control's own classes, inside the frame: Figma's FieldContent, 16/24 Regular, 12 in. */
export const FIELD_CONTROL =
  'h-full min-w-0 flex-1 bg-transparent py-2.5 pl-3 text-base-lower/6 text-inherit outline-none placeholder:text-content-disabled disabled:cursor-not-allowed';

/** A trailing icon's room: Figma's 10 either side of a 24 icon, the box's full height. */
export const FIELD_TRAILING = 'flex h-full w-11 shrink-0 items-center justify-center';

/** A trailing icon that is a button (clear, show password): its own focus ring, inside the box's. */
export const FIELD_TRAILING_BUTTON =
  FIELD_TRAILING +
  ' rounded-full outline-none focus-visible:ring-2 focus-visible:ring-brand-surface focus-visible:ring-inset disabled:cursor-not-allowed';
