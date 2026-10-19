import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import 'maplibre-gl/dist/maplibre-gl.css';
import './contribute.css';

import { connectContributions } from '@/features/contribute';

import { ContributeApp } from './contribute-app.tsx';

// This page's own Supabase client, under its own auth storage key, so the
// phone's anonymous identity never replaces an editor's studio session. No
// studio code here, which scripts/checks/check-build.mjs proves for this
// page's chunks.
connectContributions();
const root = document.getElementById('root');
if (!root) throw new Error('contribute/index.html has no #root element to mount the page in.');

createRoot(root).render(
  <StrictMode>
    <ContributeApp />
  </StrictMode>,
);
