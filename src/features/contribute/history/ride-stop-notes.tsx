import { useIsFetching } from '@tanstack/react-query';

import { historyKeys } from './history-keys';
import { useRideTrail } from '../map/use-ride-trail';
import { StopNotesView } from '../stop-notes/stop-notes-view';
import type { Recording } from '../storage/recording-schema';

interface RideStopNotesProps {
  recording: Recording;
  onClose: () => void;
}

/**
 * A saved ride's Stops notes, read only: History never changes what was uploaded. Each stop's place
 * and map come from the ride's trail, read as the ride's own map reads it (useRideTrail): a ride not
 * on this phone has no flags on its line, so it names no places.
 */
export function RideStopNotes({ recording, onClose }: RideStopNotesProps) {
  const marks = recording.marks ?? [];
  const trail = useRideTrail(recording.id, recording);
  // Read from this phone's fixes, under the key the ride's own map reads it by.
  const isTrailReading = useIsFetching({ queryKey: historyKeys.trail(recording.id, 'phone') }) > 0;
  return (
    <div className="pointer-events-auto">
      <StopNotesView
        view={{ kind: 'screen' }}
        stopNotes={{ marks, trail, isTrailReading }}
        onClose={onClose}
      />
    </div>
  );
}
