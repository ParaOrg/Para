import { createClient } from '@supabase/supabase-js';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import 'maplibre-gl/dist/maplibre-gl.css';
import '@/styles/global.css';
import { setSupabase, supabaseConfig } from '@/features/studio';

import { StudioApp } from './studio-app.tsx';

// The entry point decides how this page talks to Supabase; everything else
// reads the client it sets here. Default auth settings: the editor keeps a
// session and finishes password-reset links.
if (supabaseConfig) setSupabase(createClient(supabaseConfig.url, supabaseConfig.key));

const root = document.getElementById('root');
if (!root) throw new Error('studio/index.html has no #root element to mount the studio in.');

createRoot(root).render(
  <StrictMode>
    <StudioApp />
  </StrictMode>,
);
