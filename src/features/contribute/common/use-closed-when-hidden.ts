import { useEffect, type Dispatch, type SetStateAction } from 'react';

/**
 * Closes a question when its screen is hidden: History and Account stay drawn once opened
 * (contribute-page.tsx, <Activity>), and a question left open must not be there on the way back.
 * Hiding a screen ends its effects, so this one's ending is the moment it hides; what else the
 * screen holds (its scroll, its data) stays. `setOpen` is a state setter, `closed` its closed value.
 */
export function useClosedWhenHidden<T>(
  setOpen: Dispatch<SetStateAction<T>>,
  closed: NoInfer<T>,
): void {
  useEffect(() => () => setOpen(closed), [setOpen, closed]);
}
