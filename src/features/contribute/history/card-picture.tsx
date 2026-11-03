import type { RecordingTrail } from '@/features/routes/map/recording-trail';

import { TrailSketch } from './trail-sketch';

interface CardPictureProps {
  /** The picture of the whole trail on the map, taken as its form opened; null for none. */
  picture: string | null;
  /** The trail, drawn when there is no picture; null for an upload with no copy on this phone. */
  trail: RecordingTrail | null;
}

/**
 * The card's left edge (Figma 4518:24518), 91 across: the trail's picture, else the trail drawn on
 * the plain ground, else the plain ground alone. Decorative: the card's words say where it went.
 */
export function CardPicture({ picture, trail }: CardPictureProps) {
  return (
    <div className="w-22.75 shrink-0 overflow-hidden rounded-l-xl bg-surface-secondary">
      {picture ? (
        <img
          src={picture}
          alt=""
          loading="lazy"
          decoding="async"
          className="size-full object-cover"
        />
      ) : (
        trail && <TrailSketch trail={trail} />
      )}
    </div>
  );
}
