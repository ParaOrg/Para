import type { Meta, StoryObj } from '@storybook/react-vite';

import { CommuteStats, type CommuteNumbers } from './commute-stats';
import type { VehicleRides } from './vehicle-grid';

/** The frame's counts: no UV Express or ferry ride. */
const FRAME_RIDES: VehicleRides = {
  jeep: 5,
  eJeep: 2,
  uvExpress: 0,
  bus: 12,
  train: 2,
  ferry: 0,
};
const NO_RIDES: VehicleRides = {
  jeep: 0,
  eJeep: 0,
  uvExpress: 0,
  bus: 0,
  train: 0,
  ferry: 0,
};
const MANY_RIDES: VehicleRides = {
  jeep: 1_204,
  eJeep: 310,
  uvExpress: 88,
  bus: 4_020,
  train: 912,
  ferry: 14,
};

/** The frame's numbers (4511:22712). */
const FRAME_NUMBERS: CommuteNumbers = {
  recordings: 6,
  seconds: 62 * 3600 + 900,
  distanceM: 421_300,
  walkM: 168_000,
  farePhpTotal: 129,
  fareRecordings: 4,
  ridesByVehicle: FRAME_RIDES,
};

const meta = {
  title: 'Features/Contribute/CommuteStats',
  component: CommuteStats,
  args: {
    state: { kind: 'shown', numbers: FRAME_NUMBERS },
  },
  decorators: [
    (Story) => (
      <div className="w-[393px] bg-surface px-5 py-6">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof CommuteStats>;

export default meta;
type Story = StoryObj<typeof meta>;

/** As the frame has it (4511:22712): each share said beside its word, and ₱129 as 129 pesos. */
export const Default: Story = {};

/** Placeholders until the first numbers come. */
export const Loading: Story = { args: { state: { kind: 'loading' } } };

/** No numbers to be had, offline with none kept: one short line. */
export const Offline: Story = {
  args: { state: { kind: 'failed', message: 'Your statistics show when you’re online.' } },
};

/** No recordings yet: zeros, and the bar empty and grey. */
export const NoRecordings: Story = {
  args: {
    state: {
      kind: 'shown',
      numbers: {
        recordings: 0,
        seconds: 0,
        distanceM: 0,
        walkM: 0,
        farePhpTotal: 0,
        fareRecordings: 0,
        ridesByVehicle: NO_RIDES,
      },
    },
  },
};

/** One recording, under an hour: Route recorded, and minutes; its fare not said, so `--`. */
export const OneShortRecording: Story = {
  args: {
    state: {
      kind: 'shown',
      numbers: {
        recordings: 1,
        seconds: 1500,
        distanceM: 6_200,
        walkM: 800,
        farePhpTotal: 0,
        fareRecordings: 0,
        ridesByVehicle: { ...NO_RIDES, jeep: 1 },
      },
    },
  },
};

/** A tiny share still shows, as a sliver. */
export const TinyShare: Story = {
  args: {
    state: {
      kind: 'shown',
      numbers: {
        recordings: 120,
        seconds: 1240 * 3600,
        distanceM: 1_240_000,
        walkM: 2_000,
        farePhpTotal: 31_204.5,
        fareRecordings: 96,
        ridesByVehicle: MANY_RIDES,
      },
    },
  },
};

/** Rides recorded, but none saying its fare (the app does not ask yet): `--`, said as none. */
export const FareNotKnown: Story = {
  args: {
    state: {
      kind: 'shown',
      numbers: { ...FRAME_NUMBERS, farePhpTotal: 0, fareRecordings: 0 },
    },
  },
};

/** A whole number of pesos: no centavos shown. */
export const FareWholePesos: Story = {
  args: {
    state: {
      kind: 'shown',
      numbers: { ...FRAME_NUMBERS, farePhpTotal: 1_240, fareRecordings: 31 },
    },
  },
};

/** Centavos in the total: shown to two places, ₱1,240.50. */
export const FareWithCentavos: Story = {
  args: {
    state: {
      kind: 'shown',
      numbers: { ...FRAME_NUMBERS, farePhpTotal: 1_240.5, fareRecordings: 31 },
    },
  },
};
