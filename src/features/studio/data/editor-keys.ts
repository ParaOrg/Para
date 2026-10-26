export const editorKeys = {
  all: ['studio-editors'] as const,
  names: () => [...editorKeys.all, 'names'] as const,
};
