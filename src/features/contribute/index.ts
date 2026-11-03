// The contribute feature: the page where a contributor records a route on the phone. The
// shell imports it from here; nothing outside the feature imports its inner
// files (.claude/CLAUDE.md, Import rules).
export { ContributePage } from './contribute-page';
export { PageErrorScreen } from './screens/page-error-screen';
export type { ContributeLocatorSlot } from './map/contribute-map';
export { connectContributions } from './api/contribute-config';
export { hasOpenRecording } from './storage/open-recording';
export { askForPersistentStorage } from './storage/persistent-storage';
export { applySlowloadIfAsked } from './common/slowload-switch';
export { applySlowmoIfAsked } from './motion/slowmo-switch';
export { isNativeApp, prepareNativeApp } from './native-bridge/native-app';
export { runEmulatorRide } from './native-bridge/native-emulator-ride';
