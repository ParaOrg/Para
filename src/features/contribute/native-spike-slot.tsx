import { isNativeApp } from './native-app';
import { NativeSpikePanel } from './native-spike-panel';

/**
 * The spike's panel and a banner that says this is the test build. Shown whenever this is the
 * app's build (`--mode apk`), not only when Capacitor is detected, so a missed detection still
 * shows it. Not lazy: nothing can leave it blank. The web page's bundle drops it, as `MODE` is
 * known at build time.
 */
export function NativeSpikeSlot() {
  if (import.meta.env.MODE !== 'apk' && !isNativeApp()) return null;
  return <NativeSpikePanel />;
}
