import { useId } from 'react';

import type { ReviewComparison } from '../data/review-comparison';
import { reviewLines } from '../data/review-geometry';

interface ReviewGeometryProps {
  comparison: ReviewComparison;
}
export function ReviewGeometry({ comparison }: ReviewGeometryProps) {
  const id = useId();
  const approved = reviewLines(comparison.approved);
  const proposed = reviewLines(comparison.proposed);
  const points = [...approved, ...proposed].flat();
  if (!points.length) return <p>No drawing is present in either version.</p>;
  const xs = points.map(([x]) => x);
  const ys = points.map(([, y]) => y);
  const west = Math.min(...xs),
    south = Math.min(...ys);
  const width = Math.max(...xs) - west,
    height = Math.max(...ys) - south;
  const scale = Math.min(560 / Math.max(width, 0.00001), 260 / Math.max(height, 0.00001));
  const paths = (lines: typeof approved) =>
    lines.map((line) =>
      line
        .map(
          ([x, y]) =>
            `${320 + (x - west - width / 2) * scale},${160 - (y - south - height / 2) * scale}`,
        )
        .join(' '),
    );
  return (
    <figure className="rounded-xl border border-border-primary bg-surface-secondary p-3">
      <svg viewBox="0 0 640 320" role="img" aria-labelledby={id} className="w-full">
        <title id={id}>Drawing comparison: approved dashed, draft solid</title>
        {[...new Set(paths(approved))]
          .filter((path) => !path.includes(' '))
          .map((path) => (
            <circle
              key={`approved-point:${path}`}
              cx={Number(path.split(',')[0])}
              cy={Number(path.split(',')[1])}
              r="6"
              className="fill-content-secondary"
            />
          ))}
        {[...new Set(paths(proposed))]
          .filter((path) => !path.includes(' '))
          .map((path) => (
            <circle
              key={`draft-point:${path}`}
              cx={Number(path.split(',')[0])}
              cy={Number(path.split(',')[1])}
              r="4"
              className="fill-brand-surface"
            />
          ))}
        {[...new Set(paths(approved))].map((path) => (
          <polyline
            key={`approved:${path}`}
            points={path}
            fill="none"
            strokeWidth="4"
            strokeDasharray="8 6"
            className="stroke-content-secondary"
          />
        ))}
        {[...new Set(paths(proposed))].map((path) => (
          <polyline
            key={`draft:${path}`}
            points={path}
            fill="none"
            strokeWidth="2"
            className="stroke-brand-surface"
          />
        ))}
      </svg>
      <figcaption className="text-sm">
        Approved: grey dashed · Draft: blue solid. Both drawings use the same scale.
      </figcaption>
    </figure>
  );
}
