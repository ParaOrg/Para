import type { CapacitorConfig } from '@capacitor/cli';

// The contributor app: the contributor page's own build (vite.apk.config.ts) inside a native
// Android shell. See docs/adr/0006-the-contributor-app-is-a-capacitor-android-app.md.
const config: CapacitorConfig = {
  appId: 'ph.para.contributor',
  appName: 'Para Contributor',
  webDir: 'dist-apk',
  android: {
    // Set for the location plugin, whose README said Android otherwise halts the page's location
    // updates five minutes after the screen goes off. Kept with RideService: the page still hears
    // its fixes through the bridge, and whether it is still needed is a phone test of its own.
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
