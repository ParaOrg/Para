import type { OldParaMode, OldParaRouteSummary } from './old-para-route-schema';

const MODE_LABEL: Record<OldParaMode, string> = {
  jeepney: 'Jeepney',
  uv: 'UV Express',
  bus: 'Bus',
};

type RouteFacts = Pick<OldParaRouteSummary, 'paraId' | 'mode' | 'isVerified' | 'coarse'>;

/**
 * A route's line of facts in a list, so none rests on colour: "Jeepney · PARA-0001 · Verified",
 * with "No line" where the old app has none.
 */
export function oldParaRouteFacts(route: RouteFacts): string {
  return [
    MODE_LABEL[route.mode],
    route.paraId,
    route.isVerified ? 'Verified' : 'Unverified',
    route.coarse ? null : 'No line',
  ]
    .filter((fact) => fact !== null)
    .join(' · ');
}

/** A route's shape and length, for its card: "Loop · one way · 5.0 km". */
export function oldParaRouteShape(
  route: Pick<OldParaRouteSummary, 'isLoop' | 'isOneway' | 'lengthM'>,
): string {
  return [
    route.isLoop ? 'Loop' : 'End to end',
    route.isOneway ? 'one way' : 'both ways',
    route.lengthM === null ? null : `${(route.lengthM / 1000).toFixed(1)} km`,
  ]
    .filter((fact) => fact !== null)
    .join(' · ');
}
