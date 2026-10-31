import type { MapLibreMap } from 'maplibre-gl';

import type { RecordingTrail } from '@/features/routes/map/recording-trail';

import { TRAIL_PICTURE, trailFit, type PictureBox } from './trail-picture-frame';

/** How long the tiles for the trail's view may take to arrive before the picture is given up. */
const TILES_MS = 8000;
/** WebP where the browser can write it, a JPEG where it cannot: both small at this quality. */
const QUALITY = 0.7;

/** Settles true once the map is idle (everything for the view drawn), false after `ms`. */
function whenIdle(map: MapLibreMap, ms: number): Promise<boolean> {
  return new Promise((resolve) => {
    const timer = window.setTimeout(() => {
      map.off('idle', handleIdle);
      resolve(false);
    }, ms);
    function handleIdle() {
      window.clearTimeout(timer);
      resolve(true);
    }
    map.once('idle', handleIdle);
  });
}

/**
 * The box cut from the map's canvas, in the same frame it is drawn: the canvas keeps no drawing
 * after it is shown (no preserveDrawingBuffer, which would cost the whole session), so it is read
 * inside the render event that drew it.
 */
function cutInNextRender(map: MapLibreMap, box: PictureBox): Promise<string> {
  return new Promise((resolve) => {
    map.once('render', () => {
      const source = map.getCanvas();
      const scale = source.width / source.clientWidth;
      const picture = document.createElement('canvas');
      picture.width = TRAIL_PICTURE.width;
      picture.height = TRAIL_PICTURE.height;
      picture
        .getContext('2d')
        ?.drawImage(
          source,
          box.x * scale,
          box.y * scale,
          box.width * scale,
          box.height * scale,
          0,
          0,
          TRAIL_PICTURE.width,
          TRAIL_PICTURE.height,
        );
      const webp = picture.toDataURL('image/webp', QUALITY);
      resolve(webp.startsWith('data:image/webp') ? webp : picture.toDataURL('image/jpeg', QUALITY));
    });
    map.triggerRepaint();
  });
}

/**
 * A picture of the whole trail on the map, as History's card shows it: the camera framed on every
 * run of it, its tiles waited for, the frame cut and the camera put back where the rider had it.
 * Null when there is no trail, or the tiles for it could not be had (no signal): the card then
 * draws the trail itself rather than show a blank map.
 */
export async function captureTrailPicture(
  map: MapLibreMap,
  trail: RecordingTrail,
): Promise<string | null> {
  const canvas = map.getCanvas();
  const fit = trailFit(trail, canvas.clientWidth, canvas.clientHeight);
  if (!fit) return null;
  const camera = {
    center: map.getCenter(),
    zoom: map.getZoom(),
    bearing: map.getBearing(),
    pitch: map.getPitch(),
  };
  let hasTileFailed = false;
  const handleError = () => {
    hasTileFailed = true;
  };
  map.on('error', handleError);
  try {
    map.fitBounds(fit.bounds, {
      padding: fit.padding,
      bearing: 0,
      pitch: 0,
      maxZoom: 17,
      animate: false,
    });
    const isIdle = await whenIdle(map, TILES_MS);
    if (!isIdle || hasTileFailed || !map.areTilesLoaded()) return null;
    return await cutInNextRender(map, fit.box);
  } finally {
    map.off('error', handleError);
    map.jumpTo(camera);
  }
}
