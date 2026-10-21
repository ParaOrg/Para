import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, within } from 'storybook/test';

import type { Recording } from './recording-schema';
import { SavedRides } from './saved-rides';
import type { UploadStatus, Uploads } from './use-uploads';

const T0 = Date.UTC(2026, 9, 19, 0, 0, 0);
const ride = (id: string, startPointName: string, offset: number): Recording => ({
  version: 1,
  id,
  status: 'saved',
  startedAt: T0 + offset,
  stoppedAt: T0 + offset + 1_800_000,
  savedAt: T0 + offset + 1_830_000,
  gaps: [],
  startPointName,
  endPointName: 'Cubao',
  description: '',
  rideKind: 'Jeep',
});
const fairview = ride('11111111-0000-4000-8000-000000000001', 'SM Fairview', 0);
const lagro = ride('11111111-0000-4000-8000-000000000002', 'Lagro', 3_600_000);

const UPLOADED: UploadStatus = { state: 'uploaded', at: T0 + 2_000_000, by: 'this-phone' };
const WAITING: UploadStatus = { state: 'waiting' };

/** Uploads that answer every recording with `status`, `waitingCount` of them not uploaded yet. */
const uploadsOf = (status: UploadStatus, waitingCount: number): Uploads => ({
  statusOf: () => status,
  waitingCount,
  upload: fn(),
  removeUploaded: fn(),
  canRemove: () => status.state === 'uploaded',
  check: null,
});

/** The Ready screen's History: shown under its button, above the Start bar. */
const meta = {
  title: 'Features/Contribute/SavedRides',
  component: SavedRides,
  args: {
    recordings: [fairview, lagro],
    uploads: uploadsOf(UPLOADED, 0),
    onDownload: fn(),
    onDeleteFromPhone: fn(),
  },
  decorators: [
    (Story) => (
      <div className="w-97.5">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof SavedRides>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Two recordings, both uploaded. */
export const Uploaded: Story = {};

/** Two waiting: the heading counts them. */
export const NotUploadedYet: Story = {
  args: { uploads: uploadsOf(WAITING, 2) },
  play: async ({ canvasElement }) => {
    await expect(
      within(canvasElement).getByRole('heading', { name: /2 not uploaded yet/ }),
    ).toBeInTheDocument();
  },
};

/** Nothing saved on this phone yet. */
export const Empty: Story = {
  args: { recordings: [] },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('No saved recordings yet.')).toBeInTheDocument();
    await expect(canvas.queryByRole('list')).toBeNull();
  },
};
