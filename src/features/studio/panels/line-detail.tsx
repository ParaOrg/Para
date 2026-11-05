import { useId, type ReactNode } from 'react';

/** Whether what the sidebar shows is a draft, or what commuters get at the next publish. */
export type LineStatus = 'draft' | 'published';

const STATUS_LABEL = {
  draft: 'Draft',
  published: 'Published',
} satisfies Record<LineStatus, string>;

// Figma 4300:20893 draws Draft in Card/orange/surface; 4614:15082 draws Published in
// Content/success. The word says it too, so the colour is never the only sign.
const STATUS_COLOUR = {
  draft: 'text-card-orange-surface',
  published: 'text-content-success',
} satisfies Record<LineStatus, string>;

/** What a fact not known yet reads, as Figma draws it. */
const UNKNOWN = '--';

interface LineDetailProps {
  /** The points drawn. */
  points: number;
  /** The line's length. */
  metres: number;
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
 * it is a draft or published, who last saved it and when, and when it was published.
 */
export function LineDetail({
  points,
  metres,
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
        <Fact term="Points">{points}</Fact>
        <Fact term="Distance">{(metres / 1000).toFixed(1)} km</Fact>
        <Fact term="Status" valueClassName={STATUS_COLOUR[status]}>
          {STATUS_LABEL[status]}
        </Fact>
        <Fact term="Author">{author ?? UNKNOWN}</Fact>
        <Fact term="Date published">{datePublished ?? UNKNOWN}</Fact>
        <Fact term="Last edited">{lastEdited ?? UNKNOWN}</Fact>
      </dl>
    </section>
  );
}

interface FactProps {
  term: string;
  children: ReactNode;
  /** The value's colour, where it is not the row's. */
  valueClassName?: string;
}

/** One row of Line detail: its name, 140 across, and its value. */
function Fact({ term, children, valueClassName = 'text-content-quaternary' }: FactProps) {
  return (
    <div className="flex items-center">
      <dt className="w-35 shrink-0 font-medium text-content-quaternary">{term}</dt>
      <dd className={'min-w-0 flex-1 ' + valueClassName}>{children}</dd>
    </div>
  );
}
