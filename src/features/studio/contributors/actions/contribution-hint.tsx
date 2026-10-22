import { Button } from '@/design-system/primitives/button';

import type { ContributionStart } from './contribution-start';

interface ContributionHintProps {
  start: ContributionStart;
  onForget: () => void;
}

/**
 * Over the Playground while a drawing came from an upload: what it is, and the
 * names its phone gave the ends as hints for choosing the route and direction.
 */
export function ContributionHint({ start, onForget }: ContributionHintProps) {
  return (
    <section
      aria-label="From an upload"
      className="absolute top-[calc(1rem+var(--map-safe-top))] left-4 z-10 flex w-72 max-w-[calc(100%-2rem)] flex-col gap-2 rounded-2xl bg-surface p-4 text-sm text-content-secondary shadow-lg ring-1 ring-content-primary/10"
    >
      {start.kind === 'direction' ? (
        <>
          <h2 className="text-base font-bold text-content-primary">An upload&apos;s line</h2>
          <p>Start: {start.startName || 'not given'}</p>
          <p>End: {start.endName || 'not given'}</p>
          <p>Press Done, then pick its route and direction, or a new route by its two ends.</p>
        </>
      ) : (
        <>
          <h2 className="text-base font-bold text-content-primary">A hintuan from a hinto</h2>
          <p>Shape the box, then press Done. The uploads with a hinto inside it are recorded.</p>
        </>
      )}
      <Button variant="secondary" label="Not from an upload" onClick={onForget} />
    </section>
  );
}
