import marker from './edsa-carousel-marker.svg';
import wordmark from './edsa-carousel-wordmark.svg';

/**
 * The EDSA Carousel's own mark at the top of its RouteCard (4895:21212), at opacity/60: the
 * "marker-edsa-carousel" E on a white radius/md tile (4895:21182) and the "EDSA CAROUSEL" wordmark,
 * 24 tall (4895:21090), 8 apart. Decoration: the card's list already names the ride.
 */
export function EdsaCarouselMark() {
  return (
    <span
      aria-hidden
      data-testid="edsa-carousel-mark"
      className="flex items-center gap-2 opacity-60"
    >
      <span className="flex rounded-md bg-bg-surface">
        <img src={marker} alt="" className="size-7" />
      </span>
      <img src={wordmark} alt="" className="h-6 w-auto" />
    </span>
  );
}
