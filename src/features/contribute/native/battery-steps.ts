/** A phone maker known to stop apps that run in the background, and how to allow Para. */
export interface BatteryHelp {
  maker: string;
  steps: string;
}

const MAKERS: { names: string[]; help: BatteryHelp }[] = [
  {
    names: ['xiaomi', 'redmi', 'poco'],
    help: {
      maker: 'Xiaomi',
      steps:
        'Open Para’s settings, tap Battery saver, then choose No restrictions. Then go back and turn on Autostart.',
    },
  },
  {
    names: ['oppo', 'realme'],
    help: {
      maker: 'Oppo or Realme',
      steps:
        'Open Para’s settings, tap Battery, then turn on Allow background activity and Allow auto launch.',
    },
  },
  {
    names: ['vivo', 'iqoo'],
    help: {
      maker: 'Vivo',
      steps:
        'Open Para’s settings, tap Battery, then choose Allow high background power consumption.',
    },
  },
  {
    names: ['samsung'],
    help: {
      maker: 'Samsung',
      steps: 'Open Para’s settings, tap Battery, then choose Unrestricted.',
    },
  },
  {
    names: ['huawei', 'honor'],
    help: {
      maker: 'Huawei or Honor',
      steps:
        'Open Para’s settings, tap Battery, then App launch. Turn off Manage automatically, and turn on Auto-launch, Secondary launch and Run in background.',
    },
  },
];

/** The steps for a phone whose maker kills background apps; null for any other maker. */
export function batteryHelpFor(manufacturer: string): BatteryHelp | null {
  const name = manufacturer.trim().toLowerCase();
  return MAKERS.find((entry) => entry.names.includes(name))?.help ?? null;
}
