import { Button } from '@/design-system/primitives/button';

import { shortDate } from './status';

interface NoticesProps {
  offline: boolean;
  age: { publishedAt: string | null; stale: boolean };
  needRefresh: boolean;
  /** The new version's "Update Para!". */
  onUpdate: () => void;
}

/**
 * What the public map shows about itself, over the map, for as long as it is
 * so: how old the map is when it came from the phone's store, and a new
 * version waiting. A load that failed is a toast (loadProblemToast).
 */
export function Notices({ offline, age, needRefresh, onUpdate }: NoticesProps) {
  return (
    <>
      {/*
        Honesty about age. With no signal, or a network too slow to answer in
        time, the map is whatever the phone kept, and the date comes from inside
        the file itself, so it is exact. It sits bottom left over the map's ⓘ on a
        phone, top left on a wide map.
      */}
      {(offline || age.stale) && (
        <div
          data-testid="offline"
          className="absolute bottom-[calc(3.5rem+env(safe-area-inset-bottom))] left-[calc(1rem+env(safe-area-inset-left))] z-10 rounded-full bg-neutral-800/90 px-3 py-1.5 text-xs text-content-inverse shadow backdrop-blur @wide:top-[calc(1rem+env(safe-area-inset-top))] @wide:bottom-auto"
        >
          {offline ? 'Offline' : 'Not refreshed'}
          {age.publishedAt && <> · map as of {shortDate(age.publishedAt)}</>}
        </div>
      )}

      {/*
        A new version never applies itself: a reload mid-ride would drop the
        selected route. A Primary button, 24 below the top, centred (Figma 3732:2512).
      */}
      {needRefresh && (
        <div className="pointer-events-none absolute top-[calc(1.5rem+env(safe-area-inset-top))] left-1/2 z-20 -translate-x-1/2 *:pointer-events-auto">
          <Button variant="primary" label="Update Para!" data-testid="update" onClick={onUpdate} />
        </div>
      )}
    </>
  );
}
