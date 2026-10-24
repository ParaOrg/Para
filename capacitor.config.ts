import type { CapacitorConfig } from '@capacitor/cli';

// The contributor app: the contributor page's own build (vite.apk.config.ts),
// inside a native Android shell. A spike for now (.scratch/contributor-app/).
const config: CapacitorConfig = {
  appId: 'ph.parapo.contributor',
  appName: 'ParaPo Contributor',
  webDir: 'dist-apk',
  android: {
    // Without it Android halts the page's location updates five minutes after
    // the screen goes off (the background-geolocation plugin's README).
    useLegacyBridge: true,
  },
};

export default config;
