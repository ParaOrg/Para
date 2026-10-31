import { useQuery } from '@tanstack/react-query';

import { historyKeys } from './history-keys';
import { loadThumbnails } from '../storage/recording-store';

/**
 * The pictures of each recording's trail kept on this phone, by recording: read as History opens.
 * TODO: read a page at a time once a phone keeps more than a few hundred recordings (getAll reads
 * every one, a few kB each).
 */
export function useTrailPicturesQuery() {
  return useQuery({ queryKey: historyKeys.pictures(), queryFn: loadThumbnails });
}
