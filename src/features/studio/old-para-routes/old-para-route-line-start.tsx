import type { ReactNode } from 'react';

import { Button } from '@/design-system/primitives/button';

import type { OldParaRoute } from './old-para-route-schema';
import { useOldParaRouteQuery } from './use-old-para-route-query';
import { splitAtTurnaround, turnaroundIndex, type RouteLine } from '../osm-routes/seed-points';

interface OldParaRouteLineStartProps {
  paraId: string;
  onStart: (route: OldParaRoute, part: RouteLine) => void;
  /** The card's way back to the list, shown under the buttons. */
  back: ReactNode;
}

/**
 * The buttons that start a drawing from an old Para route's line, once its file is read: one, or
 * one for each half of a route that goes out and comes back, as the OSM card offers them.
 */
export function OldParaRouteLineStart({ paraId, onStart, back }: OldParaRouteLineStartProps) {
  const read = useOldParaRouteQuery(paraId);

  if (read.status === 'pending') return <p>Reading {paraId}’s line…</p>;
  if (read.status === 'error')
    return (
      <>
        <p>{paraId}’s line didn’t load.</p>
        <Button
          variant="secondary"
          size="small"
          label="Try again"
          onClick={() => void read.refetch()}
        />
        {back}
      </>
    );

  const route = read.data;
  const turn = turnaroundIndex(route);
  const halves = turn === null ? null : splitAtTurnaround(route, turn);
  return (
    <>
      {route.gaps.length > 0 && (
        <p>
          {route.gaps.length} {route.gaps.length === 1 ? 'gap' : 'gaps'} in its line, for the router
          to bridge.
        </p>
      )}
      {halves ? (
        <>
          <Button
            variant="primary"
            label="Draw the way out"
            onClick={() => onStart(route, halves[0])}
          />
          <Button
            variant="primary"
            label="Draw the way back"
            onClick={() => onStart(route, halves[1])}
          />
        </>
      ) : (
        <Button variant="primary" label="Start drawing" onClick={() => onStart(route, route)} />
      )}
      {back}
    </>
  );
}
