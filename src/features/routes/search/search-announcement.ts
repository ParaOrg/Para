import type { Landmark } from '../published/landmark-file-schema';

export interface AnnouncementFacts {
  isOpen: boolean;
  emptyMessage: string;
  hasFailed: boolean;
  landmark: Landmark | null;
  nearCount: number;
}

/**
 * What a screen reader hears as it changes: nothing matched, the landmarks failed, or the routes
 * near a landmark just chosen. The field keeps focus, so nothing else would tell it.
 */
export function announce({
  isOpen,
  emptyMessage,
  hasFailed,
  landmark,
  nearCount,
}: AnnouncementFacts): string {
  if (isOpen) {
    const failed = hasFailed ? 'Landmarks didn’t load; Try again is below.' : '';
    return [emptyMessage, failed].filter(Boolean).join('. ');
  }
  if (!landmark) return '';
  if (nearCount === 0) return `No Para routes near ${landmark.name} yet`;
  return `${nearCount} Para ${nearCount === 1 ? 'hintuan' : 'hintuans'} near ${landmark.name}`;
}
