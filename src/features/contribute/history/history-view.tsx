import { HistoryScreen } from './history-screen';
import { useHistoryItems } from './use-history-items';
import type { Recording } from '../storage/recording-schema';
import type { Uploads } from '../uploads/use-uploads';

interface HistoryViewProps {
  recordings: readonly Recording[];
  uploads: Uploads;
  onBack: () => void;
  onRecord: () => void;
  onDownload: (recording: Recording) => void;
  onDeleteFromPhone: (recording: Recording) => void;
}

/** History with its data: mounted only while History shows, so the account's uploads are asked for as it opens. */
export function HistoryView({ recordings, uploads, ...actions }: HistoryViewProps) {
  const items = useHistoryItems(recordings, uploads);
  return <HistoryScreen items={items} {...actions} />;
}
