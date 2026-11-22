import { useRef } from 'react';

import { Button } from '@/design-system/primitives/button';
import { CloseIcon } from '@/shared/ui/route-icons';
import { cn } from '@/shared/utils/cn';

import { BUTTON_FILL, CARD_TEXT } from './livery-card';
import type { RouteStopSignKind } from './route-stop-sign';
import { RouteStopSlot } from './route-stop-slot';
import { RouteStopsTimelineRow, type TimelineRowState } from './route-stops-timeline-row';
import type { RouteTripLineDetailPillContent } from './route-trip-line-detail-pill';
import type { RowRole } from './timeline-row-role';
import { TimelineRowTap } from './timeline-row-tap';
import type { Livery } from '../model/liveries';

interface TimelineHintuanProps {
  id: string;
  rail: string;
  /** A row's pressed look (STOP_PRESSED). */
  pressed: string;
  label: string;
  selected: boolean;
  /** What its pill says (rowRole); null, no pill. */
  pill: RouteTripLineDetailPillContent | null;
  livery: Livery;
  /** Its row's state (timelineRowStates). */
  state: TimelineRowState;
  /** The ride's start (S) or end (E) in its slot; null for any other row. */
  mark: RouteStopSignKind | null;
  /** The button under the row: Set as start under the end, × Remove as start under the start. */
  action: RowRole['action'];
  /** The row tapped; omitted, the row is not a control (TimelineRowTap). */
  onPick?: (id: string) => void;
}

/**
 * A hintuan on the way (RouteStopsTimeline Middle, 4611:10957). Where picking is on
 * (TimelineRowTap), the whole row is its button, which picks it as the ride's end or, picked, lets
 * it go; under a picked row, its own button.
 */
export function TimelineHintuan({
  id,
  rail,
  pressed,
  label,
  selected,
  pill,
  livery,
  state,
  mark,
  action,
  onPick,
}: TimelineHintuanProps) {
  // × Remove as start takes its own button away: the keyboard's focus goes
  // to the row it was under, not to the page. Set as start keeps its place,
  // the button under the row turning to × Remove as start.
  const pickButton = useRef<HTMLButtonElement>(null);
  // The rail runs on beside the button under the row where it runs on below the row.
  const isRailBelow = state === 'rest' || state === 'selectedTop';
  return (
    <li data-testid="trip-hintuan" data-hintuan={id} data-state={selected ? 'selected' : 'rest'}>
      <TimelineRowTap
        ref={pickButton}
        testId="trip-hintuan-pick"
        isSelected={selected}
        pressed={pressed}
        onTap={onPick && (() => onPick(id))}
      >
        <RouteStopsTimelineRow
          variant="middle"
          state={state}
          rail={rail}
          label={<span data-part="name">{label}</span>}
          slot={<RouteStopSlot livery={livery} sign={mark} pill={pill} />}
        />
      </TimelineRowTap>
      {/* Under the row, its own button (Figma Choosing and Variant3,
          4137:9887 and 4148:12161): a sibling of the row's, never inside it. */}
      {action && (
        <div className="flex gap-2 px-4">
          <span aria-hidden className={cn('w-6 shrink-0', isRailBelow && rail)} />
          {/* A card-filled button takes its words from around it: the card's own, as on the card.
              Figma draws no Set as start on the surface; this keeps the card's look until the
              owner draws one. */}
          <span className={cn('pt-1.5 pb-2.5', CARD_TEXT[livery])}>
            <Button
              variant="primary"
              size="small"
              fill={BUTTON_FILL[livery]}
              label={action.label}
              firstIcon={action.isRemove ? <CloseIcon /> : undefined}
              onClick={() => {
                if (action.isRemove) pickButton.current?.focus();
                action.onTap();
              }}
            />
          </span>
        </div>
      )}
    </li>
  );
}
