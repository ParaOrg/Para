import { LOOP_WORD } from '@/features/routes/model/routes';

import { DraftBadge } from './draft-badge';

interface RouteInfoHeadingProps {
  /** The heading's id: the form is named by it. */
  id: string;
  /** The editor's own draft of the route is stored: the badge beside the heading. */
  hasDraft: boolean;
  isEdit: boolean;
  isReturnTrip: boolean;
  isLoop: boolean;
  /** The route's ends are set by the route it belongs to, a return trip's. */
  isRouteLocked: boolean;
}

/**
 * The route sidebar's heading, Route Information, its draft badge, and under it what this save is
 * and what it changes: an edit changes both directions' route facts.
 */
export function RouteInfoHeading({
  id,
  hasDraft,
  isEdit,
  isReturnTrip,
  isLoop,
  isRouteLocked,
}: RouteInfoHeadingProps) {
  return (
    <>
      <div className="flex items-center gap-2">
        <h2 id={id} className="text-xl/7 font-semibold text-content-primary">
          Route Information
        </h2>
        {hasDraft && <DraftBadge />}
      </div>
      <p className="-mt-2 text-xs text-content-quaternary">
        {panelTitle({ isEdit, isReturnTrip, isLoop })}
        {isRouteLocked && ' · the ends belong to the route, so both directions share them'}
        {isEdit &&
          " · the ends, via, mode and fare note are the route's: a change here is a change to both directions"}
      </p>
    </>
  );
}

/** What this save is, under the heading: an edit, a return trip, or a new route or ikot. */
function panelTitle({
  isEdit,
  isReturnTrip,
  isLoop,
}: Pick<RouteInfoHeadingProps, 'isEdit' | 'isReturnTrip' | 'isLoop'>): string {
  const loopWord = LOOP_WORD.toLowerCase();
  if (isEdit) return isLoop ? `Update this ${loopWord}` : 'Update this direction';
  if (isReturnTrip) return 'Draw the return trip';
  return isLoop ? `Save this ${loopWord}` : 'Save this route';
}
