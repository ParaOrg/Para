import { TextField } from '@/design-system/primitives/text-field';

interface ViaFieldProps {
  value: string;
  isLoop: boolean;
  /** The route's facts are fixed: a return trip, or a new route already written. */
  isLocked: boolean;
  onChange: (via: string) => void;
}

/** A route's via: what tells it from another with the same ends, or a loop from another with its signboard. */
export function ViaField({ value, isLoop, isLocked, onChange }: ViaFieldProps) {
  return (
    <div className="mt-3">
      <TextField
        label={
          <>
            Via{' '}
            <span className="text-content-disabled">
              {isLoop
                ? '(only if another ikot has this signboard)'
                : '(only if another route shares both ends)'}
            </span>
          </>
        }
        disabled={isLocked}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onClear={() => onChange('')}
        placeholder="Zabarte"
      />
    </div>
  );
}
