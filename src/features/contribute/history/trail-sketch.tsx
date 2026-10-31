import { MAP_COLOURS } from '@/design-system/foundation/map-colours';
import type { RecordingTrail } from '@/features/routes/map/recording-trail';
import type { Mode } from '@/features/routes/model/ride-recording';

import { sketchLines } from './trail-sketch-paths';

/** The card's picture box, in CSS pixels: Figma's 91 by 120. */
const WIDTH = 91;
const HEIGHT = 120;

/**
 * Each mode's line as the map draws it: walked dashed, each dash's ends rounded, ridden solid. The
 * colours are the map's own, so the sketch follows them when they change.
 */
const LINE_STYLE: Record<Mode, { stroke: string; dash?: string }> = {
  walk: { stroke: MAP_COLOURS['Map/Trail/line'], dash: '3 6' },
  ride: { stroke: MAP_COLOURS['Map/Trail/line'] },
};

interface TrailSketchProps {
  trail: RecordingTrail;
}

/** The whole trail drawn on the card's plain ground, for a recording with no picture of the map. */
export function TrailSketch({ trail }: TrailSketchProps) {
  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      aria-hidden
      className="size-full"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {sketchLines(trail, WIDTH, HEIGHT).map((line, index) => (
        <path
          // A trail's runs never reorder: their place in it is who they are.
          key={index}
          d={line.d}
          stroke={LINE_STYLE[line.mode].stroke}
          strokeWidth={3}
          strokeDasharray={LINE_STYLE[line.mode].dash}
        />
      ))}
    </svg>
  );
}
