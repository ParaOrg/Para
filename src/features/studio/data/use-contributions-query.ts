import { useQuery } from '@tanstack/react-query';

import { contributionKeys } from './contribution-keys';
import {
  fetchContributionDetail,
  fetchContributions,
  type ContributionPeriod,
} from './contributions-read';

/** Asked only when signed in: row security answers no one else, and an empty list would mislead. */
export function useContributionsQuery(days: ContributionPeriod, isSignedIn: boolean) {
  return useQuery({
    queryKey: contributionKeys.list(days),
    queryFn: () => fetchContributions(days),
    enabled: isSignedIn,
  });
}

export function useContributionDetailQuery(id: string | null) {
  return useQuery({
    queryKey: contributionKeys.detail(id ?? ''),
    queryFn: () => fetchContributionDetail(id ?? ''),
    enabled: id !== null,
  });
}
