/** History's own reads of this phone's storage, kept by TanStack Query while History is open. */
export const historyKeys = {
  all: ['history'] as const,
  pictures: () => [...historyKeys.all, 'pictures'] as const,
  /** The facts of the recordings whose cards need their fixes read, by their ids. */
  facts: (recordingIds: readonly string[]) => [...historyKeys.all, 'facts', recordingIds] as const,
};
