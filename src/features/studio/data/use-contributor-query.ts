import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { contributionKeys } from './contribution-keys';
import { blockContributor, unblockContributor } from './contributions-write';
import { fetchContributor } from './contributor-read';

export function useContributorQuery(contributorId: string) {
  return useQuery({
    queryKey: contributionKeys.phone(contributorId),
    queryFn: () => fetchContributor(contributorId),
  });
}

/** Blocks a phone with a note, or unblocks it; that phone is read again. */
export function useBlockContributorMutation(contributorId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ isBlocking, note }: { isBlocking: boolean; note: string }) =>
      isBlocking ? blockContributor(contributorId, note) : unblockContributor(contributorId),
    onSuccess: () => client.invalidateQueries({ queryKey: contributionKeys.phone(contributorId) }),
  });
}
