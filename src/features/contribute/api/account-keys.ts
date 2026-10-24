export const accountKeys = {
  all: ['account'] as const,
  session: () => [...accountKeys.all, 'session'] as const,
};
