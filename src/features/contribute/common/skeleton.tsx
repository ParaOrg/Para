import { cn } from '@/shared/utils/cn';

import './skeleton.css';

interface SkeletonProps {
  /** Its size and corners, the real element's: `h-6 w-32 rounded-full`. */
  className: string;
  /** False before the wait has lasted long enough to show (useIsSlowLoad): it keeps its room, unseen. */
  isShown?: boolean;
}

/**
 * A grey shape standing where content is coming, a soft light sweeping across it (skeleton.css);
 * still with reduced motion. Decorative: the region it stands in says it is loading, with
 * aria-busy and words a screen reader hears. It can move to the design system once a second page
 * needs it; here it stays out of the shared chunk the public map loads.
 */
export function Skeleton({ className, isShown = true }: SkeletonProps) {
  return (
    <span
      aria-hidden
      data-skeleton
      className={cn(
        'relative block overflow-hidden bg-surface-tertiary',
        !isShown && 'invisible',
        className,
      )}
    >
      {isShown && (
        <span className="skeleton-shimmer absolute inset-0 bg-linear-to-r from-transparent via-surface/60 to-transparent motion-reduce:hidden" />
      )}
    </span>
  );
}
