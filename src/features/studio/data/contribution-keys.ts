import type { ContributionPeriod } from './contributions-read';

export const contributionKeys = {
  all: ['studio-contributions'] as const,
  list: (days: ContributionPeriod) => [...contributionKeys.all, 'list', days] as const,
  detail: (id: string) => [...contributionKeys.all, 'detail', id] as const,
};
