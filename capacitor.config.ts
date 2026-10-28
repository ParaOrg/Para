import type { CapacitorConfig } from '@capacitor/cli';

// The contributor app: the contributor page's own build (vite.apk.config.ts) inside a native
// Android shell. See docs/adr/0006-the-contributor-app-is-a-capacitor-android-app.md.
const config: CapacitorConfig = {
  appId: 'ph.para.contributor',
  appName: 'Para Contributor',
  webDir: 'dist-apk',
  android: {
    // Without it Android halts the page's location updates five minutes after the screen
    // goes off (the background-geolocation plugin's README).
    useLegacyBridge: true,
  },
  plugins: {
    SystemBars: {
      // The page draws edge to edge (viewport-fit=cover) and keeps clear of the status and
      // navigation bars with env(safe-area-inset-*), as it does in a phone's browser.
      insetsHandling: 'native',
      // Dark icons: the page is light, whatever the phone's own theme.
      style: 'LIGHT',
      initialViewportFitValueHint: 'cover',
    },
  },
};

export default config;
