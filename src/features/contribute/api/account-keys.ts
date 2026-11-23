export const accountKeys = {
  all: ['account'] as const,
  session: () => [...accountKeys.all, 'session'] as const,
  profile: () => [...accountKeys.all, 'profile'] as const,
  uploads: () => [...accountKeys.all, 'uploads'] as const,
  stats: () => [...accountKeys.all, 'stats'] as const,
  uses: () => [...accountKeys.all, 'uses'] as const,
  /** Delete account's mutation: Account keeps its screen up while one is on its way. */
  deleteAccount: () => [...accountKeys.all, 'delete-account'] as const,
};
