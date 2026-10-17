// The studio: the feature's public API, what the shells import. Add a line
// when something outside the feature needs more; nothing outside imports its
// inner files (.claude/CLAUDE.md, Import rules).
export { AuthDialogs } from './auth/auth-dialogs';
export { SignIn } from './auth/sign-in';
export { skipSignInForTests } from './auth/test-bypass';
export { useAuthFlow } from './auth/use-auth-flow';
export { usePasswordRecovery } from './auth/use-password-recovery';
export { useSession } from './auth/use-session';
export { loadHotspotsFromSupabase } from './data/hotspots-read';
export { lineOf, listDirections } from './data/live';
export { getSupabase, setSupabase, supabaseConfig, supabaseConfigError } from './data/supabase';
export { DrawToolbar } from './drawing/draw-toolbar';
export { STUDIO_BASEMAPS, STUDIO_BASEMAP_THUMBNAILS } from './drawing/studio-basemaps';
export { useDrawing } from './drawing/use-drawing';
export { useFollow } from './drawing/use-follow';
export { useLoopClosing } from './drawing/use-loop-closing';
export { MapPlaceholder } from './maps/map-placeholder';
export { MapSwitch } from './maps/map-switch';
export { useStudioMap } from './maps/use-studio-map';
export { AccountPill } from './panels/account-pill';
export { NewButtons } from './panels/new-buttons';
export { returnTripLeft } from './panels/return-trip';
export { SaveToasts } from './panels/save-toasts';
export { StudioHotspotCard } from './panels/studio-hotspot-card';
export { StudioSaveSheets } from './panels/studio-save-sheets';
export { StudioTripCard } from './panels/studio-trip-card';
export { useDeleteActions } from './panels/use-delete-actions';
export { useSaveFlow } from './panels/use-save-flow';
export { useSaveTarget } from './panels/use-save-target';
export { useStudioTrip } from './panels/use-studio-trip';
