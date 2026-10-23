import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

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
      <ul className="w-97.5 bg-surface-secondary p-4 font-sn-pro text-content-primary">
        <Story />
      </ul>
    ),
  ],
} satisfies Meta<typeof SavedRideRow>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Waiting: Story = {};

/** In flight: no Try again, and no delete until it settles. */
export const Uploading: Story = {
  args: { status: { state: 'uploading' } },
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: /More actions/ }));
    await expect(within(canvasElement).queryByRole('button', { name: /Delete/ })).toBeNull();
  },
};

/** No signal: it tries again on its own, and Try again is there to hurry it. */
export const WillRetry: Story = {
  args: {
    status: {
      state: 'failed',
      message: 'Not uploaded yet: no signal. It tries again when the phone is back online.',
      brief: 'No signal',
      willRetry: true,
    },
  },
};

/** ParaPo will not take it: Failed, in the error colour with its own icon. */
export const NotAccepting: Story = {
  args: {
    status: {
      state: 'failed',
      message: "ParaPo's checks refused this recording. It stays on this phone.",
      brief: "Refused by ParaPo's checks",
      willRetry: false,
    },
  },
};

export const Uploaded: Story = {
  args: { status: { state: 'uploaded', at: T0, by: 'phone' }, canRemove: true },
};

/** The upload could not be taken back; the card says why in one line. */
export const RemoveFailed: Story = {
  args: {
    status: { state: 'uploaded', at: T0, by: 'phone', problem: 'Not removed. No signal' },
    canRemove: true,
  },
};

/** Uploaded from an identity this phone no longer holds: no Remove upload in its menu. */
export const EarlierIdentity: Story = {
  args: { status: { state: 'uploaded', at: T0, by: 'earlier' }, canRemove: false },
};

export const Removing: Story = { args: { status: { state: 'removing' } } };

/** The upload removed from ParaPo; the phone keeps its copy and offers Upload again. */
export const Removed: Story = { args: { status: { state: 'removed' } } };

export const RemovedByEditor: Story = { args: { status: { state: 'removed', byEditor: true } } };

/** A build with no database: recordings stay on the phone. */
export const OnPhoneOnly: Story = { args: { status: { state: 'unavailable' } } };

export const LongNames: Story = {
  args: {
    recording: {
      ...recording,
      startPointName: 'Bagong Silang Kanan 5 Barangay Hall, beside the basketball court',
      endPointName: 'Quezon Memorial Circle, the jeepney stop under the footbridge',
    },
  },
};

/** Delete from phone asks first, and Keep it hands focus back to the dots. */
export const AskingBeforeDelete: Story = {
  args: { status: { state: 'uploaded', at: T0, by: 'phone' }, canRemove: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: /More actions/ }));
    await userEvent.click(canvas.getByRole('button', { name: /Delete from phone/ }));
    await expect(canvas.getByRole('button', { name: 'Keep it' })).toHaveFocus();
    await userEvent.click(canvas.getByRole('button', { name: 'Keep it' }));
    await expect(canvas.getByRole('button', { name: /More actions/ })).toHaveFocus();
  },
};

/** The dots pressed: Download, Remove upload and Delete from phone, quiet until asked for. */
export const ActionsOpen: Story = {
  args: { status: { state: 'uploaded', at: T0, by: 'phone' }, canRemove: true },
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: /More actions/ }));
  },
};

/** Remove upload asks first, and says the phone keeps its copy. */
export const AskingBeforeRemoveUpload: Story = {
  args: { status: { state: 'uploaded', at: T0, by: 'phone' }, canRemove: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: /More actions/ }));
    await userEvent.click(canvas.getByRole('button', { name: /Remove upload/ }));
    await expect(canvas.getByRole('button', { name: /^Remove$/ })).toBeInTheDocument();
  },
};
