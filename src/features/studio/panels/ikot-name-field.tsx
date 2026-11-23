import { TextField } from '@/design-system/primitives/text-field';

interface IkotNameFieldProps {
  value: string;
  /** The route's facts belong to the route: locked for a return trip and a retried new route. */
  isLocked: boolean;
  onChange: (name: string) => void;
}

/**
 * An ikot's Ikot name, in Origin and Destination's place: an ikot has no ends, so it is called by
 * what its jeeps say, stored as its signboard (ADR 0005). Required; no other route asks for one.
 */
export function IkotNameField({ value, isLocked, onChange }: IkotNameFieldProps) {
  return (
    <TextField
      label="Ikot name"
      aria-required
      disabled={isLocked}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onClear={() => onChange('')}
      placeholder="UP – Ikot"
      data-testid="save-ikot-name"
    />
  );
}
