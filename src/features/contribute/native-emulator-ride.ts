/** The CI emulator ride's driver, loaded only in the build made for it (app/contribute/main.tsx). */
export async function runEmulatorRide(): Promise<void> {
  const { runEmulatorRide: run } = await import('./native/emulator-ride');
  await run();
}
