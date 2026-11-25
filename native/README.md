# Para commuter app: map spike

Commuter-app ticket 02 (`.scratch/commuter-app/issues/02-native-map-spike.md`, ADR 0008). A
throwaway Expo app that shows Para's map natively: our own style and tiles from `para-tiles`
(ADR 0007), and every published direction as one line layer, read with the web's own
`src/features/routes/published/` reader. The panel at the top shows how long the style, the
routes and the first full drawing took.

It never touches the web app. `native/` is ignored by the web's ESLint and has its own
`node_modules`.

## Run it

MapLibre React Native is native code, so Expo Go cannot load it: the app needs a development
build.

- **iPhone, no Mac:** an Apple Developer account ($99 a year), then
  `npx eas-cli build --profile development --platform ios`. EAS asks to register the phone and
  builds in the cloud; install from the link it gives.
- **iPhone, with a Mac and Xcode:** `npx expo run:ios --device`.
- **Android:** `npx expo run:android` with the Android SDK, or the EAS command with
  `--platform android` (no account fee for a debug build).

Then `npx expo start --dev-client` and open the app on the phone.

## Checks

- `npx tsc --noEmit`
- `npx expo export --platform ios` bundles the app with the shared reader (no phone needed).
