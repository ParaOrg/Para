import { AlertCircleIcon } from '@/design-system/primitives/field-icons';
import { LocationIcon } from '@/design-system/primitives/location-icon';
import type { LocatorNote } from '@/features/locator';
import type { LoadProblemToast } from '@/features/published-map';
import { StandingToasts } from '@/shared/ui/standing-toasts';

/** What the locator last said, and how many times: each says it again (Locator's onNote). */
export interface SaidNote {
  note: LocatorNote;
  saying: number;
}

export interface PageToastsProps {
  locatorNote: SaidNote | null;
  /** A failed load of the published map (loadProblemToast), or null. */
  load: LoadProblemToast | null;
}

/**
 * What went wrong on the public map, as toasts at the top: the locator's note, with the location
 * drawing, and a failed load of the published map, with the warning one. Its own chunk with its
 * drawings, fetched the first time the page has something to say.
 */
export function PageToasts({ locatorNote, load }: PageToastsProps) {
  const toasts = [
    locatorNote && {
      id: locatorNote.note.id,
      saying: locatorNote.saying,
      content: {
        kind: 'problem' as const,
        icon: <LocationIcon />,
        title: locatorNote.note.title,
        body: locatorNote.note.body,
      },
    },
    load && {
      id: load.id,
      saying: load.saying,
      content: {
        kind: 'problem' as const,
        icon: <AlertCircleIcon />,
        title: load.title,
        body: load.body,
        action: load.action,
      },
    },
  ].filter((toast) => toast !== null);
  return <StandingToasts toasts={toasts} />;
}
