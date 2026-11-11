import type { KeepRecordingBrand } from './keep-recording-makers';

/** What Keep Para recording says on one group's phones: their name, and the steps, in order. */
export interface KeepRecordingSteps {
  phones: string;
  steps: readonly string[];
}

/**
 * Each group's steps, in the words its own settings use. Open settings goes to the first step's
 * screen where the phone lets an app open it, else Para's page in Settings
 * (NativePermissionsPlugin.openAutostartSettings).
 */
export const KEEP_RECORDING_STEPS: Record<KeepRecordingBrand, KeepRecordingSteps> = {
  xiaomi: {
    phones: 'Xiaomi, Redmi and POCO',
    steps: ['Turn on Autostart for Para.', 'In Para’s Battery saver, choose No restrictions.'],
  },
  oppo: {
    phones: 'OPPO, realme and OnePlus',
    steps: [
      'Turn on Auto launch for Para.',
      'In Para’s Battery usage, turn on Allow background activity.',
    ],
  },
  vivo: {
    phones: 'vivo and iQOO',
    steps: [
      'Turn on Autostart for Para.',
      'In Para’s Battery, turn on High background power consumption.',
    ],
  },
  transsion: {
    phones: 'Infinix and Tecno',
    steps: [
      'In Phone Master, turn on Auto-start for Para.',
      'In Para’s Battery, turn off battery saving for Para.',
    ],
  },
  samsung: {
    phones: 'Samsung',
    steps: [
      'In Para’s Battery, choose Unrestricted.',
      'Make sure Para is not in Sleeping apps or Deep sleeping apps.',
    ],
  },
  huawei: {
    phones: 'Huawei and Honor',
    steps: [
      'In App launch, turn off Manage automatically for Para.',
      'Turn on Auto-launch, Secondary launch and Run in background.',
    ],
  },
};
