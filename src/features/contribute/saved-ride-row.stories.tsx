import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';

import type { Recording } from './recording-schema';
import { SavedRideRow } from './saved-ride-row';

const T0 = Date.UTC(2026, 9, 19, 0, 0, 0);
const recording: Recording = {
  version: 1,
  id: '11111111-0000-4000-8000-000000000001',
  status: 'saved',
  startedAt: T0,
  stoppedAt: T0 + 1_800_000,
  savedAt: T0 + 1_830_000,
  gaps: [],
  startPointName: 'SM Fairview',
  endPointName: 'Cubao',
  description: '',
  rideKind: 'Jeep',
};

const meta = {
  title: 'Features/Contribute/SavedRideRow',
  component: SavedRideRow,
  args: {
    recording,
    status: { state: 'waiting' },
    canRemove: false,
    onDownload: fn(),
    onUpload: fn(),
    onRemoveUpload: fn(),
    onDeleteFromPhone: fn(),
  },
  decorators: [
    (Story) => (
      <ul className="w-[393px] bg-surface px-4 font-sn-pro text-content-primary">
        <Story />
      </ul>
    ),
  ],
} satisfies Meta<typeof SavedRideRow>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Waiting: Story = {};

/** In flight: no Try again, and no delete until it settles. */
export const Uploading: Story = { args: { status: { state: 'uploading' } } };

export const Uploaded: Story = {
  args: { status: { state: 'uploaded', at: T0, by: 'phone' }, canRemove: true },
};

export const NoSignal: Story = {
  args: {
    status: {
      state: 'failed',
      message: 'Not uploaded yet: no signal. It tries again when the phone is back online.',
      willRetry: true,
    },
  },
};

/** ParaPo answered but turned the upload away, such as with sign-ups off: not a signal problem. */
export const NotAccepting: Story = {
  args: {
    status: {
      state: 'failed',
      message:
        'Not uploaded yet: ParaPo cannot take uploads right now. It stays on this phone. It tries again later.',
      willRetry: true,
    },
  },
};

export const Refused: Story = {
  args: {
    status: {
      state: 'failed',
      message: "ParaPo's checks refused this recording. It stays on this phone.",
      willRetry: false,
    },
  },
};

/** The upload removed from ParaPo; the phone keeps its copy and offers Upload again. */
export const Removed: Story = { args: { status: { state: 'removed' } } };

/** Uploaded from an identity this phone no longer holds: it cannot be removed from here. */
export const EarlierIdentity: Story = {
  args: { status: { state: 'uploaded', at: T0, by: 'earlier' }, canRemove: false },
};

/** A build with no database: recordings stay on the phone. */
export const Unavailable: Story = { args: { status: { state: 'unavailable' } } };

export const LongNames: Story = {
  args: {
    recording: {
      ...recording,
      startPointName: 'Bagong Silang Kanan 5 Barangay Hall, beside the basketball court',
      endPointName: 'Quezon Memorial Circle, the jeepney stop under the footbridge',
    },
  },
};
