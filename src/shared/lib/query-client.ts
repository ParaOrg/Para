import { QueryClient } from '@tanstack/react-query';

/** Mutations need an explicit retry after the editor checks the current state. */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: 0 },
      mutations: { retry: false },
    },
  });
}
