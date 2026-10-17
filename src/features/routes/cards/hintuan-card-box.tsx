import { HintuanIcon, TerminalIcon } from '@/shared/ui/route-icons';

import type { HotspotKind, Hotspot } from '../model/hotspots';

// Figma's HotspotSelectionBar, a terminal's and a hintuan's: the fill, its
// hairlines and its letter.
const BAR = {
  terminal:
    'bg-map-hotspots-card-terminal-surface border-map-hotspots-card-terminal-border-primary',
  hintuan: 'bg-map-hotspots-card-hintuan-surface border-map-hotspots-card-hintuan-border-primary',
} satisfies Record<HotspotKind, string>;

const LETTER = { terminal: <TerminalIcon />, hintuan: <HintuanIcon /> } satisfies Record<
  HotspotKind,
  unknown
>;

interface HintuanCardBoxProps {
  box: Hotspot;
  /** The box as it is written on the ground, numbered where two share a name (placeBoxes). */
  name: string;
  isSelected: boolean;
  /** Whether the route counter sits across this row's foot, so it makes room. */
  hasCounter: boolean;
  /** The row was tapped: pick it, or, Selected, let it go. */
  onToggle: () => void;
}

/** One box of the place as Figma's HotspotSelectionBar: its kind's fill, letter and name. */
export function HintuanCardBox({
  box,
  name,
  isSelected,
  hasCounter,
  onToggle,
}: HintuanCardBoxProps) {
  return (
    <button
      type="button"
      data-testid="card-box"
      data-box={box.id}
      data-kind={box.kind}
      // A toggle: the Selected row is pressed, a tap on it lets it
      // go, and a tap on any row picks that one.
      aria-pressed={isSelected}
      onClick={onToggle}
      className={
        'relative flex w-full items-center gap-1 border-y-[0.6px] px-4 pt-3 text-left font-sn-pro text-base/6 font-medium text-content-inverse ' +
        BAR[box.kind] +
        // The last row makes room for the counter across the join.
        (hasCounter ? ' pb-11' : ' pb-2.5')
      }
    >
      <span aria-hidden className="size-6 shrink-0 *:size-full">
        {LETTER[box.kind]}
      </span>
      <span className="min-w-0 flex-1 truncate">{name}</span>
      {/* Pressed in when Selected, as a RouteCard is. */}
      <span
        aria-hidden
        className={
          'pointer-events-none absolute inset-0 ' +
          (isSelected ? 'shadow-route-card-primary-selected' : 'shadow-route-card-primary')
        }
      />
    </button>
  );
}
