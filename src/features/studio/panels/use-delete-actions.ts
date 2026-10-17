import type { useSavedHotspots } from '@/features/routes/map/use-saved-hotspots';
import type { useSavedRoutes } from '@/features/routes/map/use-saved-routes';
import { hotspotLabel, type HotspotRow } from '@/features/routes/model/hotspots';
import { isLoop, LOOP_WORD, type DirectionRow } from '@/features/routes/model/routes';

import { endsRefusal } from './hotspot-in-use';
import { deleteHotspot } from '../data/hotspots-write';
import { deleteDirection } from '../data/routes-write';

interface DeleteActionsOptions {
  signedIn: boolean;
  /** Signed out, a delete asks for sign-in instead. */
  onSignInNeeded: () => void;
  saved: Pick<ReturnType<typeof useSavedRoutes<DirectionRow>>, 'directions' | 'select' | 'reload'>;
  hotspots: Pick<ReturnType<typeof useSavedHotspots<HotspotRow>>, 'select' | 'reload'>;
  setNotice: (text: string | null) => void;
}

/**
 * Delete on a trip's card and on a hotspot's: who may, what is refused and
 * what is said. Each confirms first, then writes, closes the card and reloads;
 * a failure is a notice.
 */
export function useDeleteActions({
  signedIn,
  onSignInNeeded,
  saved,
  hotspots,
  setNotice,
}: DeleteActionsOptions) {
  const onDeleteHotspot = async (s: HotspotRow) => {
    // As Done does: signed out, the delete would go out on the publishable key
    // and match no row, and deleteHotspot would only say "Nothing was changed".
    // Asking for sign-in first lets the delete go through.
    if (!signedIn) {
      onSignInNeeded();
      return;
    }
    // A route's end cannot go while the route names it (endsRefusal).
    const refusal = endsRefusal(s, saved.directions);
    if (refusal) {
      setNotice(refusal);
      return;
    }
    if (!window.confirm(`Delete ${s.kind} "${hotspotLabel(s)}"?`)) return;
    try {
      await deleteHotspot(s);
      hotspots.select(null);
      await hotspots.reload();
    } catch (e) {
      setNotice(e instanceof Error ? e.message : String(e));
    }
  };

  const onDelete = async (v: DirectionRow) => {
    // Signed out, the delete would match no row and deleteDirection would only say
    // "Nothing was changed"; ask for sign-in first (onDeleteHotspot).
    if (!signedIn) {
      onSignInNeeded();
      return;
    }
    const confirmation = isLoop(v)
      ? `Delete the ${LOOP_WORD.toLowerCase()} "${v.route?.name}"?`
      : `Delete "${v.route?.name}" — ${v.name}?`;
    if (!window.confirm(confirmation)) return;
    try {
      await deleteDirection(v);
      saved.select(null);
      await saved.reload();
    } catch (e) {
      setNotice(e instanceof Error ? e.message : String(e));
    }
  };

  return { onDelete, onDeleteHotspot };
}
