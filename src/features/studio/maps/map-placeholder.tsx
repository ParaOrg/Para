import { useId } from 'react';

import { Button } from '@/design-system/primitives/button';

import type { StudioMapName } from './studio-map';

type PlaceholderMap = Exclude<StudioMapName, 'playground'>;

interface MapPlaceholderProps {
  map: PlaceholderMap;
  /** Whether a line is half drawn, waiting in the Playground. */
  hasLine: boolean;
  onOpenPlayground: () => void;
}

const WORDS: Record<PlaceholderMap, { title: string; body: string }> = {
  contributors: {
    title: 'Contributors map',
    body: 'Rides that contributors record will appear here, to look over before anything is drawn from them. None are shown yet.',
  },
  public: {
    title: 'Public map',
    body: 'The map commuters see will appear here, as published. It is not shown in the studio yet.',
  },
};

/** What a map not built yet will hold, said plainly, over the map that stays as it was. */
export function MapPlaceholder({ map, hasLine, onOpenPlayground }: MapPlaceholderProps) {
  const titleId = useId();
  const { title, body } = WORDS[map];
  return (
    <div className="absolute inset-0 z-5 grid place-items-center bg-surface-secondary p-4">
      <section
        aria-labelledby={titleId}
        className="flex max-w-sm flex-col gap-3 rounded-2xl bg-surface p-5 text-sm text-content-secondary shadow-lg ring-1 ring-content-primary/10"
      >
        <h2 id={titleId} className="text-base font-bold text-content-primary">
          {title}
        </h2>
        <p>{body}</p>
        <p>
          {hasLine
            ? 'The camera, the basemap and the line you were drawing wait in the Playground.'
            : 'The camera and the basemap wait in the Playground.'}
        </p>
        <Button variant="primary" label="Back to the Playground" onClick={onOpenPlayground} />
      </section>
    </div>
  );
}
