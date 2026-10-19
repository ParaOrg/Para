import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { contributionKeys } from './contribution-keys';
import {
  fetchContributionDetail,
  fetchContributions,
  type ContributionPeriod,
} from './contributions-read';
import { deleteContribution } from './contributions-write';

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

/** Deletes an upload, then forgets it: every list it was in is read again, and its trail dropped. */
export function useDeleteContributionMutation() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: deleteContribution,
    onSuccess: (_, id) => {
      client.removeQueries({ queryKey: contributionKeys.detail(id) });
      return client.invalidateQueries({ queryKey: [...contributionKeys.all, 'list'] });
    },
  });
}
