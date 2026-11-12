import { hotspotLabel, type Hotspot } from '../model/hotspots';

interface RouteListHotspotRowsProps {
  /** The hotspots under the tap, a row each. */
  hotspots: readonly Hotspot[];
  /** A hotspot's row: open its card. */
  onHotspot: (hotspot: Hotspot) => void;
}

/**
 * The hotspots under a tap, first in the route list (RouteCardList): plain rows, a row a box,
 * and nothing at all when the tap hit none.
 */
export function RouteListHotspotRows({ hotspots, onHotspot }: RouteListHotspotRowsProps) {
  if (hotspots.length === 0) return null;
  return (
    // Full-bleed rows: a whole row is the target, not the words inside it.
    <ul className="border-t border-border-primary">
      {hotspots.map((s) => (
        <li key={s.id} className="border-b border-border-primary last:border-b-0">
          <button
            type="button"
            data-testid="chooser-item"
            onClick={() => onHotspot(s)}
            className="block w-full px-4 py-2.5 text-left hover:bg-surface-secondary"
          >
            <span className="block truncate font-medium text-content-primary">
              {hotspotLabel(s)}
            </span>
            <span className="block truncate text-xs text-content-quaternary">
              {s.kind === 'terminal' ? 'Terminal' : 'Hintuan'}
              {hotspotLabel(s) !== s.name && ` · ${s.name}`}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
