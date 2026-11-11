import { rideTitleOf } from './ride-title';
import { ArrowRightIcon } from '../common/history-icons';
import type { Recording } from '../storage/recording-schema';

interface RideHeaderProps {
  recording: Recording;
}

/** The sheet's head: the ride's name, and where it went after the arrow. */
export function RideHeader({ recording }: RideHeaderProps) {
  return (
    <div className="flex flex-col gap-1 px-5 pt-1 pb-8">
      <h1 className="text-2xl/8 font-semibold break-words">{rideTitleOf(recording)}</h1>
      {recording.endPointName && (
        <p className="flex items-center gap-2 text-xl/7 font-medium text-content-quaternary">
          <span aria-hidden className="size-7 shrink-0 *:size-full">
            <ArrowRightIcon />
          </span>
          <span className="sr-only">to</span>
          <span className="min-w-0 flex-1 break-words">{recording.endPointName}</span>
        </p>
      )}
    </div>
  );
}
