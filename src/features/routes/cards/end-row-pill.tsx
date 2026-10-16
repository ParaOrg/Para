import {
  RouteTripLineDetailPill,
  type RouteTripLineDetailPillContent,
} from './route-trip-line-detail-pill';
import type { Livery } from '../model/liveries';

interface EndRowPillProps {
  livery: Livery;
  /** What it says (endRowPill): the end's code, if any, and the ride's pesos. */
  pill: RouteTripLineDetailPillContent;
}

/**
 * An end row's pill, 8 after its name as a hintuan's is (the 4 of the row's
 * gap and 4 more), centred on the name's 28 line.
 */
export function EndRowPill({ livery, pill }: EndRowPillProps) {
  return (
    <span className="ml-1 flex h-7 shrink-0 items-center">
      <RouteTripLineDetailPill livery={livery} {...pill} />
    </span>
  );
}
