import { HistoryScreen } from './history-screen';
import { useHistoryItems } from './use-history-items';
import { useTrailPicturesQuery } from './use-trail-pictures-query';
import type { Recording } from '../storage/recording-schema';
import type { Uploads } from '../uploads/use-uploads';

interface HistoryViewProps {
  recordings: readonly Recording[];
  uploads: Uploads;
  onOpenRecord: () => void;
  onRemoveFromPhone: (recording: Recording) => void;
}

const NO_PICTURES: ReadonlyMap<string, string> = new Map();

/**
 * History with its data: mounted only while History shows, so the account's uploads and the
 * trails' pictures are read as it opens. A card with no picture draws its trail.
 */
export function HistoryView({ recordings, uploads, ...actions }: HistoryViewProps) {
  const pictures = useTrailPicturesQuery();
  // Pictures that could not be read are none: every card draws its trail instead.
  const known = pictures.isError ? NO_PICTURES : pictures.data;
  const items = useHistoryItems(recordings, uploads, known);
  return <HistoryScreen items={items} pictures={known ?? NO_PICTURES} {...actions} />;
}
