export const reviewKeys = {
  all: ['studio-review'] as const,
  publication: () => [...reviewKeys.all, 'publication'] as const,
  comparison: (id: string, revision: number) =>
    [...reviewKeys.all, 'comparison', id, revision] as const,
  drafts: () => [...reviewKeys.all, 'drafts'] as const,
};
