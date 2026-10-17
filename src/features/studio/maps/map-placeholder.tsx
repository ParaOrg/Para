import { useId } from 'react';

import type { StudioMapName } from './studio-map';

type PlaceholderMap = Exclude<StudioMapName, 'playground'>;

interface MapPlaceholderProps {
  map: PlaceholderMap;
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
export function MapPlaceholder({ map, onOpenPlayground }: MapPlaceholderProps) {
  const titleId = useId();
  const { title, body } = WORDS[map];
  return (
    <div className="absolute inset-0 z-[5] grid place-items-center bg-white/70 p-4 backdrop-blur-[2px]">
      <section
        aria-labelledby={titleId}
        className="flex max-w-sm flex-col gap-3 rounded-2xl bg-white p-5 text-sm text-neutral-700 shadow-lg ring-1 ring-black/10"
      >
        <h2 id={titleId} className="text-base font-bold text-neutral-900">
          {title}
        </h2>
        <p>{body}</p>
        <p>The camera, the basemap and a line you were drawing wait in the Playground.</p>
        <button
          type="button"
          onClick={onOpenPlayground}
          className="self-start rounded-full bg-neutral-900 px-4 py-2 font-medium text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900"
        >
          Back to the Playground
        </button>
      </section>
    </div>
  );
}
