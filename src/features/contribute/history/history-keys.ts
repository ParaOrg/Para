/** History's own reads, of this phone's storage and of a ride's upload, kept by TanStack Query. */
export const historyKeys = {
  all: ['history'] as const,
  pictures: () => [...historyKeys.all, 'pictures'] as const,
  /** The facts of the recordings whose cards need their fixes read, by their ids. */
  facts: (recordingIds: readonly string[]) => [...historyKeys.all, 'facts', recordingIds] as const,
  /** The whole trail of one ride, for its screen's map: from its fixes on this phone, or its upload. */
  trail: (recordingId: string, source: 'phone' | 'upload') =>
    [...historyKeys.all, 'trail', recordingId, source] as const,
};
