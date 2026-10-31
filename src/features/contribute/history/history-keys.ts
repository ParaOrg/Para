/** History's own reads of this phone's storage, kept by TanStack Query while History is open. */
export const historyKeys = {
  all: ['history'] as const,
  pictures: () => [...historyKeys.all, 'pictures'] as const,
  facts: (recordingId: string) => [...historyKeys.all, 'facts', recordingId] as const,
};
