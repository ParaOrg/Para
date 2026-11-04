import { createClient } from '@supabase/supabase-js';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import 'maplibre-gl/dist/maplibre-gl.css';
import '@/styles/global.css';
import { setSupabase, supabaseConfig } from '@/features/studio';
import type { Database } from '@/shared/types/database.types';
import { ErrorBoundary } from '@/shared/ui/error-boundary';
import { PageErrorScreen } from '@/shared/ui/page-error-screen';

import { StudioApp } from './studio-app.tsx';

// The entry point decides how this page talks to Supabase; everything else
// reads the client it sets here. Default auth settings: the editor keeps a
// session and finishes password-reset links.
if (supabaseConfig) setSupabase(createClient<Database>(supabaseConfig.url, supabaseConfig.key));

/** The line under the error screen's heading: a stand-in until the owner writes it. */
const PAGE_ERROR_DESCRIPTION = 'Check your signal, then tap Try again.';

const root = document.getElementById('root');
if (!root) throw new Error('studio/index.html has no #root element to mount the studio in.');

createRoot(root).render(
  <StrictMode>
    <ErrorBoundary fallback={<PageErrorScreen description={PAGE_ERROR_DESCRIPTION} />}>
      <StudioApp />
    </ErrorBoundary>
  </StrictMode>,
);
