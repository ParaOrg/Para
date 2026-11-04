import { lazy, type ComponentType } from 'react';

import { retryingImport } from '@/shared/utils/retrying-import';

import { accountChunk, historyChunk } from './screen-loaders';
import type { FlagStopButtonProps } from './screens/flag-stop-button';

/*
 * The contributor page's screens that are not in its opening: each its own chunk, fetched on first
 * need or ahead of it by the page's loaders here, and drawn through React.lazy.
 */

/*
 * History and Account, drawn at once when their chunk is already here (screen-loaders.ts), else
 * through React.lazy. A lazy screen whose fetch failed stays failed for good: ScreenUnavailable's
 * Try again makes fresh ones (makeLazyScreens) before it draws the screen again. Not on the
 * failure itself: React renders a failed screen a second time, and a fresh one there would fetch
 * again, fail again, and never stop.
 */
const lazyHistory = () =>
  lazy(() => historyChunk.load().then((chunk) => ({ default: chunk.HistoryView })));
const lazyAccount = () =>
  lazy(() => accountChunk.load().then((chunk) => ({ default: chunk.AccountView })));
/** The lazy History and Account as they stand: fresh ones after each makeLazyScreens. */
export const lazyScreens = { history: lazyHistory(), account: lazyAccount() };
/** Makes History and Account lazy afresh, so drawn again they fetch again (ScreenUnavailable). */
export function makeLazyScreens(): void {
  lazyScreens.history = lazyHistory();
  lazyScreens.account = lazyAccount();
}

// The map's credits, opened from the ⓘ on Start: fetched on the tap, not with the page.
export const MapDataSourceView = lazy(() =>
  import('@/features/routes/map/map-data-source-view').then((module) => ({
    default: module.MapDataSourceView,
  })),
);

// The toasts that say what went wrong, fetched the first time something does.
const loadPageToasts = retryingImport(() => import('./notices/page-toasts'));
export const PageToasts = lazy(() =>
  loadPageToasts().then((module) => ({ default: module.PageToasts })),
);
// Shown only once a recording is under way or found open, never on the page's first paint. Ready
// fetches them as it opens (use-screen-warmup.ts), so Start never waits on the network, nor fails
// without one. A fetch ahead that failed offline does not leave them unreachable: each asks again
// afresh.
export const loadRecordingScreen = retryingImport(() => import('./screens/recording-screen'));
export const loadUnfinishedScreen = retryingImport(() => import('./screens/unfinished-screen'));
export const loadForgetOtherAccounts = retryingImport(() => import('./api/forget-other-accounts'));
export const loadStopRecordingScreen = retryingImport(
  () => import('./screens/stop-recording-screen'),
);
export const loadFlagStopButton = retryingImport(() => import('./screens/flag-stop-button'));
export const loadSaveForm = retryingImport(() => import('./screens/save-form'));
// The check before a first upload, with Cloudflare's widget: fetched only when one is asked for.
const loadUploadCheck = retryingImport(() => import('./uploads/upload-check'));
export const UploadCheck = lazy(() =>
  loadUploadCheck().then((module) => ({ default: module.UploadCheck })),
);
const loadTutorial = retryingImport(() => import('./tutorial/tutorial'));
const loadTrackRoutesOffer = retryingImport(() => import('./tutorial/track-routes-offer'));
export const TrackRoutesOffer = lazy(() =>
  loadTrackRoutesOffer().then((module) => ({ default: module.TrackRoutesOffer })),
);
export const Tutorial = lazy(() => loadTutorial().then((module) => ({ default: module.Tutorial })));
export const SaveForm = lazy(() => loadSaveForm().then((module) => ({ default: module.SaveForm })));
export const RecordingScreen = lazy(() =>
  loadRecordingScreen().then((module) => ({ default: module.RecordingScreen })),
);
export const StopRecordingScreen = lazy(() =>
  loadStopRecordingScreen().then((module) => ({ default: module.StopRecordingScreen })),
);
/** Flag a stop's place when its code could not be fetched: nothing, and the ride goes on. */
function NoFlagStopButton(): null {
  return null;
}
// Not fetched (offline before the worker kept it): the ride records on without the button, rather
// than the failed load taking the page down with it.
export const FlagStopButton = lazy<ComponentType<FlagStopButtonProps>>(() =>
  loadFlagStopButton().then(
    (module) => ({ default: module.FlagStopButton }),
    (error: unknown) => {
      console.warn('Flag a stop could not be fetched; the ride records without it.', error);
      return { default: NoFlagStopButton };
    },
  ),
);
export const UnfinishedScreen = lazy(() =>
  loadUnfinishedScreen().then((module) => ({ default: module.UnfinishedScreen })),
);
// Sign-in, sign-up and the profile step show only to a phone with no finished account, and bring
// the form fields and their checks with them: after the first sign-in the page never opens them.
export const AccountGate = lazy(() =>
  import('./account/account-gate').then((module) => ({ default: module.AccountGate })),
);

// The permissions screen exists in the Android app's build only: on the web this is null and the
// chunk is never built.
export const PermissionsOnboarding =
  import.meta.env.MODE === 'apk'
    ? lazy(() =>
        import('./native/permissions-onboarding').then((module) => ({
          default: module.PermissionsOnboarding,
        })),
      )
    : null;
