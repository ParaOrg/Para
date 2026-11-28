import { Button } from '@/design-system/primitives/button';

import { oldParaRouteFacts, oldParaRouteShape } from './old-para-route-facts';
import { OldParaRouteLineStart } from './old-para-route-line-start';
import type { OldParaRoute, OldParaRouteSummary } from './old-para-route-schema';
import type { RouteLine } from '../osm-routes/seed-points';

interface OldParaRouteCardProps {
  route: OldParaRouteSummary;
  onStartFromLine: (route: OldParaRoute, part: RouteLine) => void;
  onStartFromEnds: (route: OldParaRouteSummary) => void;
  onBack: () => void;
}

/** What the old app knew of a route's ends, for one with no line. */
function endsWords({ start, end }: OldParaRouteSummary): string {
  if (start && end) return 'No line. Its start is placed and its end marked; draw the rest.';
  if (start) return 'No line, and no end known. Its start is placed; draw the rest.';
  if (end) return 'No line, and no start known. Its end is marked; draw to it.';
  return 'No line, and neither end known: draw it by hand.';
}

/**
 * A chosen old Para route before its drawing starts: its Para ID, mode, whether the old app's
 * reviewers verified it, its shape, then how the drawing will begin. A placeholder look.
 */
export function OldParaRouteCard({
  route,
  onStartFromLine,
  onStartFromEnds,
  onBack,
}: OldParaRouteCardProps) {
  const back = (
    <Button variant="secondary" size="small" label="Back to the list" onClick={onBack} />
  );
  return (
    <>
      <div className="flex flex-col gap-1">
        <h3 className="font-semibold text-content-primary">{route.name}</h3>
        <p className="text-xs">{oldParaRouteFacts(route)}</p>
        <p className="text-xs">{oldParaRouteShape(route)}</p>
        <p className="text-xs text-content-tertiary">
          {route.isVerified
            ? 'Verified by the old app’s reviewers.'
            : 'Never reviewed in the old app.'}{' '}
          Check it on the ground before approving.
        </p>
      </div>
      {route.coarse ? (
        <OldParaRouteLineStart paraId={route.paraId} onStart={onStartFromLine} back={back} />
      ) : (
        <>
          <p>{endsWords(route)}</p>
          <Button variant="primary" label="Start drawing" onClick={() => onStartFromEnds(route)} />
          {back}
        </>
      )}
    </>
  );
}
