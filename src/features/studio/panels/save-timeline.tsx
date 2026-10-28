import type { Timeline } from '@/features/routes/model/timeline';

import { DirectionTimeline, passesThrough } from './direction-timeline';

interface SaveTimelineProps {
  isLoop: boolean;
  /** The places a loop goes round. */
  loopPlacesCount: number;
  /** What the line passes, by the rule the save will apply. */
  preview: Timeline;
}

/** What the line passes, by the rule the save will apply: seen first, stored the same. */
export function SaveTimeline({ isLoop, loopPlacesCount, preview }: SaveTimelineProps) {
  return (
    <div data-testid="save-timeline" className="mt-3 rounded-lg bg-neutral-50 px-3 py-2">
      <p className="text-xs font-medium text-neutral-600">
        {timelineHeading(isLoop, loopPlacesCount, preview.between.length)}
      </p>
      <DirectionTimeline timeline={preview} />
    </div>
  );
}

function timelineHeading(isLoop: boolean, loopPlacesCount: number, passed: number): string {
  if (isLoop) {
    if (loopPlacesCount === 0)
      return 'Goes round no place yet — draw a hintuan across the road and it appears here';
    return `Goes round ${loopPlacesCount} ${loopPlacesCount === 1 ? 'place' : 'places'}, from the first drawn, in this order`;
  }
  if (passed === 0)
    return 'Passes through no hintuan yet — draw one across the road and it appears here';
  return `${passesThrough(passed)}, in this order`;
}
