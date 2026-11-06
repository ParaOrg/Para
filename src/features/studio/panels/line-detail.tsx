import { useId, type ReactNode } from 'react';

import { cn } from '@/shared/utils/cn';

/** Whether what the sidebar shows is a draft, or what commuters get at the next publish. */
export type LineStatus = 'draft' | 'published';

const STATUS_LABEL = {
  draft: 'Draft',
  published: 'Published',
} satisfies Record<LineStatus, string>;

// Draft in orange (Figma 4300:20893), Published in Content/success (4614:15082). The word says it
// too, so the colour is never the only sign.
const STATUS_COLOUR = {
  draft: 'text-content-warning',
  published: 'text-content-success',
} satisfies Record<LineStatus, string>;

/** What a fact not known yet reads, as Figma draws it. */
const UNKNOWN = '--';

interface LineDetailProps {
  /** The points drawn: a route's points, or a hotspot's corners. */
  points: number;
  /** What the points are called: a hotspot's outline has corners. */
  pointsTerm?: 'Points' | 'Corners';
  /** The line's length; a hotspot's outline has none to give. */
  metres?: number | null;
  status: LineStatus;
  /** Who last saved it, by name; null until it is known. */
  author?: string | null;
  /** When it was last published, as the sidebar says a date; null until it is known. */
  datePublished?: string | null;
  /** When it was last saved, as the sidebar says a date; null until it is known. */
  lastEdited?: string | null;
}

/**
 * The sidebar's Line detail (Figma 4300:20893, 4614:15082): the line's points and length, whether
 * it is a draft or published, who last saved it, when it was published and, published, when it
 * was last edited: the Draft frame stops at Date published.
 */
export function LineDetail({
  points,
  pointsTerm = 'Points',
  metres = null,
  status,
  author = null,
  datePublished = null,
  lastEdited = null,
}: LineDetailProps) {
  const headingId = useId();
  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-3">
      <h3 id={headingId} className="text-xl/7 font-semibold text-content-primary">
        Line detail
      </h3>
      <dl data-testid="line-detail" className="flex flex-col gap-3 text-sm/5">
        <Fact term={pointsTerm}>{points}</Fact>
        {metres !== null && <Fact term="Distance">{(metres / 1000).toFixed(1)} km</Fact>}
        <Fact term="Status" tone={status}>
          {STATUS_LABEL[status]}
        </Fact>
        <Fact term="Author">{author ?? UNKNOWN}</Fact>
        <Fact term="Date published">{datePublished ?? UNKNOWN}</Fact>
        {status === 'published' && <Fact term="Last edited">{lastEdited ?? UNKNOWN}</Fact>}
      </dl>
    </section>
  );
}

interface FactProps {
  term: string;
  children: ReactNode;
  /** A status, whose value wears its own colour; any other value reads as its label does. */
  tone?: LineStatus;
}

/** One row of Line detail: its name, 140 across, and its value. */
function Fact({ term, children, tone }: FactProps) {
  return (
    <div className="flex items-center">
      <dt className="w-35 shrink-0 font-medium text-content-quaternary">{term}</dt>
      <dd className={cn('min-w-0 flex-1', tone ? STATUS_COLOUR[tone] : 'text-content-quaternary')}>
        {children}
      </dd>
    </div>
  );
}
