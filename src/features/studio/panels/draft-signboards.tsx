import { useQueryClient } from '@tanstack/react-query';

import type { DirectionRow } from '@/features/routes/model/routes';

import { DraftSignboardsNotice } from './draft-signboards-notice';
import { SignboardEditor } from './signboard-editor';
import { reviewKeys } from '../data/review-keys';
import { useDraftSignboardsQuery } from '../data/use-draft-signboards-query';

interface DraftSignboardsProps {
  direction: DirectionRow;
  /** A board added, moved or removed; the drafted list is read again either way. */
  onChanged?: () => void;
}

/**
 * The signboards as the editor's own draft of the route lists them, when it
 * does: a change is saved on top of the draft, so starting from the approved
 * list would drop the boards the draft added. Shown only once the draft is
 * read, so nothing is changed on a list about to be replaced.
 */
export function DraftSignboards({ direction, onChanged }: DraftSignboardsProps) {
  const client = useQueryClient();
  const drafted = useDraftSignboardsQuery(direction.routeId, direction.id);
  if (drafted.isPending) return <DraftSignboardsNotice state="loading" />;
  if (drafted.isError)
    return <DraftSignboardsNotice state="error" onRetry={() => void drafted.refetch()} />;
  const handleChanged = () => {
    void client.invalidateQueries({ queryKey: reviewKeys.draftOf('route', direction.routeId) });
    onChanged?.();
  };
  return (
    <SignboardEditor
      direction={drafted.data ? { ...direction, signboards: drafted.data } : direction}
      onChanged={handleChanged}
    />
  );
}
