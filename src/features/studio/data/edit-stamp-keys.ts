import { reviewKeys } from './review-keys';

/** Under the review's keys: whatever refreshes the review (a publish, a discard) refreshes these. */
export const editStampKeys = {
  all: () => [...reviewKeys.all, 'edit-stamps'] as const,
};
