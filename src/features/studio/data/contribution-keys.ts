import type { ContributionPeriod } from './contributions-read';

export const contributionKeys = {
  all: ['studio-contributions'] as const,
  /** Every list, whatever its period: what a change to one upload makes stale. */
  lists: () => [...contributionKeys.all, 'list'] as const,
  list: (days: ContributionPeriod, showHidden: boolean) =>
    [...contributionKeys.all, 'list', days, showHidden] as const,
  /** Every phone read: an upload deleted changes its phone's count. */
  phones: () => [...contributionKeys.all, 'phone'] as const,
  phone: (contributorId: string) => [...contributionKeys.all, 'phone', contributorId] as const,
  detail: (id: string) => [...contributionKeys.all, 'detail', id] as const,
};
