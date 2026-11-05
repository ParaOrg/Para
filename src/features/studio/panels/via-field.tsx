import { useId } from 'react';

import { TextField } from '@/design-system/primitives/text-field';

interface ViaFieldProps {
  value: string;
  isLoop: boolean;
  /** The route's facts are fixed: a return trip, or a new route already written. */
  isLocked: boolean;
  onChange: (via: string) => void;
}

/**
 * A route's via: what tells it from another with the same ends, or an ikot from another with its
 * name. Its hint says which, under the field.
 */
export function ViaField({ value, isLoop, isLocked, onChange }: ViaFieldProps) {
  const hintId = useId();
  return (
    <div>
      <TextField
        label="Via (if applicable)"
        aria-describedby={hintId}
        disabled={isLocked}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onClear={() => onChange('')}
      />
      <p id={hintId} className="mt-1.5 text-xs text-content-disabled">
        {isLoop ? 'Only if another ikot has this name.' : 'Only if another route shares both ends.'}
      </p>
    </div>
  );
}
