import { useQuery } from '@tanstack/react-query';

import { historyKeys } from './history-keys';
import { loadThumbnails } from '../storage/recording-store';

/** The pictures of each recording's trail kept on this phone, by recording: read as History opens. */
export function useTrailPicturesQuery() {
  return useQuery({ queryKey: historyKeys.pictures(), queryFn: loadThumbnails });
}
