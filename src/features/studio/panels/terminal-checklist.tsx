import type { SignboardGroup } from './hotspot-checks';

interface TerminalChecklistProps {
  /** Every direction, under its route's name (groupBySignboard). */
  groups: SignboardGroup[];
  /** The directions ticked: pre-ticked, then the owner's choice. */
  ticked: ReadonlySet<string>;
  onToggle: (directionId: string) => void;
}

/**
 * A terminal's routes: a checklist of every direction, pre-ticked with the
 * ones that start inside the outline; the owner decides.
 */
export function TerminalChecklist({ groups, ticked, onToggle }: TerminalChecklistProps) {
  return (
    <fieldset className="mt-4">
      <legend className="text-xs font-medium text-neutral-700">
        Routes that stage here{' '}
        <span className="font-normal text-neutral-400">
          — pre-ticked: routes starting inside the outline
        </span>
      </legend>
      {groups.length === 0 ? (
        <p className="mt-2 text-sm text-neutral-500">No saved routes yet.</p>
      ) : (
        <ul className="mt-2 max-h-56 space-y-2 overflow-y-auto pr-1">
          {groups.map((g) => (
            <li key={g.signboard}>
              <p className="text-sm font-medium text-neutral-900">{g.signboard}</p>
              <ul className="mt-1 space-y-1">
                {g.directions.map((v) => (
                  <li key={v.id}>
                    <label className="flex cursor-pointer items-center gap-2 text-sm text-neutral-700">
                      <input
                        type="checkbox"
                        checked={ticked.has(v.id)}
                        onChange={() => onToggle(v.id)}
                        className="h-4 w-4 accent-neutral-900"
                      />
                      <span>{v.name}</span>
                    </label>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </fieldset>
  );
}
