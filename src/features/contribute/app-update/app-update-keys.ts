export const appUpdateKeys = {
  all: ['app-update'] as const,
  latest: (url: string) => [...appUpdateKeys.all, 'latest', url] as const,
};
