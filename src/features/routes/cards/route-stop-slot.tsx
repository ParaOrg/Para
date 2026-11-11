import { RouteBadge } from './route-badge';
import { RouteStopSign, type RouteStopSignKind } from './route-stop-sign';
import {
  RouteTripLineDetailPill,
  type RouteTripLineDetailPillContent,
} from './route-trip-line-detail-pill';
import type { Livery } from '../model/liveries';

interface RouteStopSlotProps {
  livery: Livery;
  /** Start's S or End's E: where the ride starts or ends; null for any other stop. */
  sign: RouteStopSignKind | null;
  /** A picked stop's pill, its code and pesos (rowRole, endRowPill); null for none. */
  pill: RouteTripLineDetailPillContent | null;
  /** A train's station code at an end, when no pill says it already; null on the road or unknown. */
  code?: string | null;
}

/**
 * What a stop's slot holds (RouteStopsCard, 4681:29138; owner, T1 and Q168): the ride's S or E,
 * then a picked stop's pill, or a train's station code at the timeline's ends.
 */
export function RouteStopSlot({ livery, sign, pill, code = null }: RouteStopSlotProps) {
  if (!sign && !pill && !code) return null;
  return (
    <>
      {sign && <RouteStopSign kind={sign} livery={livery} />}
      {pill && <RouteTripLineDetailPill livery={livery} {...pill} />}
      {!pill && code && <RouteBadge label={code} livery={livery} />}
    </>
  );
}

/** For a screen reader, after the stop's name: the sign is for the eye. */
export function SignWords({ sign }: { sign: RouteStopSignKind | null }) {
  if (!sign) return null;
  return <span className="sr-only">{sign === 'start' ? ', start' : ', end'}</span>;
}
