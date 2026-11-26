import blob from '@/features/routes/cards/route-card-blob-primary.svg';

/**
 * The cards' glow, the RouteCard's Blob file: its body 37 above the card's top and 20 right of
 * its middle, plus the 128 of blur room the file carries on every side. Pixels, as the glow is.
 */
export function CardBlob() {
  return (
    <img
      src={blob}
      alt=""
      className="pointer-events-none absolute -top-[165px] left-[calc(50%+20px)] -z-10 h-[525.538px] w-[795.076px] max-w-none -translate-x-1/2"
    />
  );
}
