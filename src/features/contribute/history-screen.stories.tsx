import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, within } from 'storybook/test';

import { HistoryScreen } from './history-screen';
import type { Recording } from './recording-schema';
import type { UploadStatus, Uploads } from './use-uploads';

const T0 = Date.UTC(2026, 9, 19, 0, 0, 0);
const PLACES = ['SM Fairview', 'Lagro', 'Novaliches', 'Tala', 'Quezon Memorial Circle'];
const ride = (index: number, startPointName: string): Recording => ({
  version: 1,
  id: `11111111-0000-4000-8000-${String(index).padStart(12, '0')}`,
  status: 'saved',
  startedAt: T0 + index * 3_600_000,
  stoppedAt: T0 + index * 3_600_000 + (index + 1) * 600_000,
  savedAt: T0 + index * 3_600_000 + (index + 1) * 600_000 + 30_000,
  gaps: [],
  startPointName,
  endPointName: 'Cubao',
  description: '',
  rideKind: 'Jeep',
});
const rides = PLACES.map((place, index) => ride(index, place));

const UPLOADED: UploadStatus = { state: 'uploaded', at: T0, by: 'this-phone' };
const WAITING: UploadStatus = { state: 'waiting' };
const UPLOADING: UploadStatus = { state: 'uploading' };
const OFFLINE: UploadStatus = {
  state: 'failed',
  message: 'Not uploaded yet: no signal. It tries again when the phone is back online.',
  brief: 'No signal',
  willRetry: true,
};
const REFUSED: UploadStatus = {
  state: 'failed',
  message: "ParaPo's checks refused this recording. It stays on this phone.",
  brief: "Refused by ParaPo's checks",
  willRetry: false,
};

/** Uploads that answer each recording from `statuses` (by id), or `fallback` for any not listed. */
const uploadsOf = (statuses: Record<string, UploadStatus>, fallback: UploadStatus): Uploads => {
  const statusOf = (recording: Recording): UploadStatus => statuses[recording.id] ?? fallback;
  return {
    statusOf,
    waitingCount: 0,
    upload: fn(),
    removeUploaded: fn(),
    canRemove: (recording) => statusOf(recording).state === 'uploaded',
    check: null,
  };
};
const allOf = (status: UploadStatus): Uploads => uploadsOf({}, status);

const meta = {
  title: 'Features/Contribute/HistoryScreen',
  component: HistoryScreen,
  parameters: { layout: 'fullscreen' },
  args: {
    recordings: rides,
    uploads: allOf(UPLOADED),
    onBack: fn(),
    onDownload: fn(),
    onDeleteFromPhone: fn(),
  },
  decorators: [
    (Story) => (
      <div className="relative h-[844px] w-97.5 overflow-hidden">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof HistoryScreen>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Every group at once: still sending, uploaded, and kept on the phone alone. */
export const Mixed: Story = {
  args: {
    uploads: uploadsOf(
      {
        [rides[0].id]: UPLOADING,
        [rides[1].id]: OFFLINE,
        [rides[2].id]: UPLOADED,
        [rides[3].id]: UPLOADED,
        [rides[4].id]: { state: 'removed' },
      },
      UPLOADED,
    ),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('heading', { level: 1, name: 'History' })).toHaveFocus();
    await expect(canvas.getAllByRole('heading', { level: 2 })).toHaveLength(3);
  },
};

export const Uploading: Story = { args: { uploads: allOf(UPLOADING) } };

/** Waiting for the signal to come back. */
export const Offline: Story = {
  args: { uploads: uploadsOf({ [rides[0].id]: WAITING, [rides[1].id]: OFFLINE }, OFFLINE) },
};

export const NotAccepting: Story = { args: { uploads: allOf(REFUSED) } };

export const Uploaded: Story = { args: { uploads: allOf(UPLOADED) } };

/** Nothing saved on this phone yet: one line and the way back. */
export const Empty: Story = {
  args: { recordings: [] },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('No recordings yet.')).toBeInTheDocument();
    await expect(canvas.queryByRole('list')).toBeNull();
    await expect(canvas.getByRole('button', { name: 'Record a route' })).toBeInTheDocument();
  },
};

/** Thirty recordings: the list scrolls under the heading. */
export const LongList: Story = {
  args: {
    recordings: Array.from({ length: 30 }, (_, index) =>
      ride(index, PLACES[index % PLACES.length]),
    ),
    uploads: allOf(UPLOADED),
  },
};
