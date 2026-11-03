import { FIELD_BOX } from '@/design-system/primitives/field-frame';

interface PasswordButtonFieldProps {
  onOpen: () => void;
}

/**
 * Account settings' Password (Figma 4540:4315): drawn as an empty InputField, it is a button that
 * opens Change password. A password is never shown, so there is nothing to type here.
 */
export function PasswordButtonField({ onOpen }: PasswordButtonFieldProps) {
  return (
    <div className="flex w-full flex-col gap-1.5 font-sn-pro">
      {/* The button says what it does; this is its label as the frame draws it. */}
      <p aria-hidden className="text-sm/5 text-content-quaternary">
        Password
      </p>
      <button
        type="button"
        aria-label="Change password"
        onClick={onOpen}
        className={'h-11 w-full rounded-xl border focus:outline-none ' + FIELD_BOX.default}
      />
    </div>
  );
}
