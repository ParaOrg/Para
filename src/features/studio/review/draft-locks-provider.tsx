import { QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useState, type ReactNode } from 'react';

import { createQueryClient } from '@/shared/lib/query-client';

interface DraftLocksProviderProps {
  children: ReactNode;
}

/** The cards' own query client: the studio's cards sit outside the review screens' one. */
export function DraftLocksProvider({ children }: DraftLocksProviderProps) {
  const [client] = useState(createQueryClient);
  useEffect(() => () => client.clear(), [client]);
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
