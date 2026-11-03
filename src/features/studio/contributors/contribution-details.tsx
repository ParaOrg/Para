import { useId, type ReactNode } from 'react';

import { Button } from '@/design-system/primitives/button';

import {
  contributionName,
  kilometres,
  manilaClock,
  manilaTime,
  minutes,
  vehicleName,
} from './contribution-format';
import { partLength, splitTrail, type TrailPart } from './trail-parts';
import type { Contribution, ContributionDetail } from '../data/contributions-read';

interface ContributionDetailsProps {
  contribution: Contribution;
  detail: ContributionDetail | undefined;
  isDetailLoading: boolean;
  detailError: string | null;
  onClose: () => void;
  /** What may be done with the upload, such as deleting it. */
  actions?: ReactNode;
  /** More about the upload, under its trail: its hintos and its phone. */
  extras?: ReactNode;
}

/** One upload, opened: what the phone saved about it, and its trail on the map. */
export function ContributionDetails({
  contribution: c,
  detail,
  isDetailLoading,
  detailError,
  onClose,
  actions,
  extras,
}: ContributionDetailsProps) {
  const titleId = useId();
  const rows: [string, string][] = [
    ['Started', manilaTime(c.startedAt)],
    ['Ended', manilaTime(c.endedAt)],
    ['Uploaded', manilaTime(c.receivedAt)],
    ['Start point', c.startName || 'Not given'],
    ['End point', c.endName || 'Not given'],
    ['Ridden', vehicleName(c.vehicle)],
    ['Distance', kilometres(c.distanceM)],
    ['Moving', minutes(c.movingSeconds)],
    ['Standing', minutes(c.standingSeconds)],
    ['No signal', minutes(c.lostSeconds)],
    ['Points', String(c.pointCount)],
    ['Contributor', c.contributorName ?? 'No name'],
    ['Phone', c.phoneCode ?? 'unknown'],
  ];
  return (
    <section
      aria-labelledby={titleId}
      className="flex flex-col gap-3 p-4 text-sm text-content-secondary"
    >
      <h3 id={titleId} className="text-base font-bold text-content-primary">
        {contributionName(c)}
      </h3>
      {c.description && <p className="text-content-primary">{c.description}</p>}
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
        {rows.map(([term, value]) => (
          <div key={term} className="contents">
            <dt className="font-bold">{term}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      <TrailSummary detail={detail} isLoading={isDetailLoading} error={detailError} />
      {extras}
      <div className="flex flex-wrap gap-2">
        {actions}
        <Button variant="secondary" label="Close" onClick={onClose} />
      </div>
    </section>
  );
}

interface TrailSummaryProps {
  detail: ContributionDetail | undefined;
  isLoading: boolean;
  error: string | null;
}

function TrailSummary({ detail, isLoading, error }: TrailSummaryProps) {
  if (error) return <p role="alert">The trail could not be read. {error}</p>;
  if (isLoading || !detail) return <p aria-live="polite">Reading the trail…</p>;
  const standing = detail.hintos.reduce((sum, h) => sum + h.seconds, 0);
  return (
    <p aria-live="polite">
      On the map: the whole trail, {detail.trail.length} points, and {detail.hintos.length}{' '}
      {detail.hintos.length === 1 ? 'hinto' : 'hintos'} ({minutes(standing)} standing).
      <PartsSummary pieces={splitTrail(detail.trail, detail.parts)} />
      {detail.marks.length > 0 && (
        <>
          {' '}
          {detail.marks.length} {detail.marks.length === 1 ? 'mark' : 'marks'}. Marked at{' '}
          {detail.marks.map(manilaClock).join(', ')}.
        </>
      )}
    </p>
  );
}

const count = (n: number, one: string, many: string): string => `${n} ${n === 1 ? one : many}`;

interface PartsSummaryProps {
  pieces: readonly TrailPart[];
}

/** The walk and ride parts as text: the map's dashed walking, for anyone not looking at it. */
function PartsSummary({ pieces }: PartsSummaryProps) {
  const walks = pieces.filter((piece) => piece.mode === 'walk');
  if (walks.length === 0) return null;
  const rides = pieces.filter((piece) => piece.mode === 'ride');
  const metres = (parts: readonly TrailPart[]) => parts.reduce((sum, p) => sum + partLength(p), 0);
  return (
    <>
      {' '}
      In {count(rides.length, 'ride', 'rides')} and {count(walks.length, 'walk', 'walks')}:{' '}
      {kilometres(metres(rides))} riding, {kilometres(metres(walks))} walking, the walking dashed.
    </>
  );
}
