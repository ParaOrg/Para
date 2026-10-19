import type { ContributionPeriod } from './contributions-read';

export const contributionKeys = {
  all: ['studio-contributions'] as const,
  list: (days: ContributionPeriod, showHidden: boolean) =>
    [...contributionKeys.all, 'list', days, showHidden] as const,
  detail: (id: string) => [...contributionKeys.all, 'detail', id] as const,
};
