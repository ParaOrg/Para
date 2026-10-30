import { AlertCircleIcon } from './field-icons';

interface FieldErrorProps {
  /** The id the control's aria-describedby names. */
  id: string;
  message: string;
}

/** Figma's Variant3 message under a field: the alert icon and the text, in Content/error. */
export function FieldError({ id, message }: FieldErrorProps) {
  return (
    <p id={id} className="flex items-center gap-1.5 text-sm/5 text-content-error">
      <span aria-hidden className="size-5 shrink-0 *:size-full">
        <AlertCircleIcon />
      </span>
      {message}
    </p>
  );
}
