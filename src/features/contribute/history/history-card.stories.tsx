import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { HistoryCard } from './history-card';
import type { RideFacts } from './ride-facts';
import type { Recording } from '../storage/recording-schema';
import type { UploadStatus } from '../uploads/upload-state';

const T0 = Date.UTC(2026, 0, 25, 0, 0, 0);
const recording: Recording = {
  version: 2,
  id: '11111111-0000-4000-8000-000000000001',
  status: 'saved',
  startedAt: T0,
  stoppedAt: T0 + 12 * 60_000,
  savedAt: T0 + 12 * 60_000 + 30_000,
  gaps: [],
  modes: [
    { time: T0, to: 'walk' },
    { time: T0 + 3 * 60_000, to: 'ride' },
  ],
  startPointName: 'Cubao via Marcos Highway',
  endPointName: 'Novaliches',
  description: '',
  rideKind: 'Jeep',
};

/** A short walk to the stop, then a ride north-east with a bend. */
const FACTS: RideFacts = {
  distanceM: 34_200,
  isWalkOnly: false,
  trail: {
    lines: [
      {
        mode: 'walk',
        path: [
          [121.052, 14.619],
          [121.054, 14.621],
          [121.056, 14.622],
        ],
      },
      {
        mode: 'ride',
        path: [
          [121.056, 14.622],
          [121.07, 14.64],
          [121.075, 14.66],
          [121.09, 14.68],
          [121.1, 14.71],
        ],
      },
    ],
    markers: [],
    marks: [],
  },
};

const UPLOADED: UploadStatus = { state: 'uploaded', at: T0, by: 'this-phone' };
const REFUSED: UploadStatus = {
  state: 'failed',
  message: "Para's checks refused this recording. It stays on this phone.",
  brief: "Refused by Para's checks",
  willRetry: false,
};
const OFFLINE: UploadStatus = {
  state: 'failed',
  message: 'Not uploaded yet: no signal. It tries again when the phone is back online.',
  brief: 'No signal',
  willRetry: true,
};

const meta = {
  title: 'Features/Contribute/HistoryCard',
  component: HistoryCard,
  args: {
    recording,
    status: UPLOADED,
    actions: { canUpload: false, isOnPhone: true, canDeleteFromPara: true, isBusy: false },
    facts: FACTS,
    picture: null,
    onUpload: fn(),
    onDownload: fn(),
    onDeleteFromPara: fn(),
    onRemoveFromPhone: fn(),
  },
  decorators: [
    (Story) => (
      <ul className="w-98.25 bg-surface px-5 pt-6 pb-48">
        <Story />
      </ul>
    ),
  ],
} satisfies Meta<typeof HistoryCard>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Uploaded: the green tick (4518:24588). */
export const Uploaded: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Uploaded')).toBeInTheDocument();
    await expect(canvas.getByText('Jan 25, 2026')).toBeInTheDocument();
    await expect(canvas.getByText('0h 12m')).toBeInTheDocument();
    await expect(canvas.getByText('34 km')).toBeInTheDocument();
  },
};

/** A true failure: the whole line is the retry button (4518:24587). */
export const TapRetry: Story = {
  args: {
    status: REFUSED,
    actions: { canUpload: false, isOnPhone: true, canDeleteFromPara: false, isBusy: false },
  },
  play: async ({ canvasElement, args }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: /^Tap retry upload/ }));
    await expect(args.onUpload).toHaveBeenCalled();
  },
};

/** No signal: it sends itself once the phone is back online, so no retry is offered. */
export const WaitingForSignal: Story = {
  args: {
    status: OFFLINE,
    actions: { canUpload: false, isOnPhone: true, canDeleteFromPara: false, isBusy: false },
  },
};

/** In flight: no retry, and nothing to remove until it settles. */
export const Sending: Story = {
  args: {
    status: { state: 'uploading' },
    actions: { canUpload: false, isOnPhone: true, canDeleteFromPara: false, isBusy: true },
  },
};

/** Kept back from sending: on this phone alone, with Upload to Para in the menu. */
export const OnlyOnThisPhone: Story = {
  args: {
    status: { state: 'held' },
    actions: { canUpload: true, isOnPhone: true, canDeleteFromPara: false, isBusy: false },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: /More actions/ }));
    await expect(canvas.getByRole('button', { name: /^Upload to Para/ })).toBeInTheDocument();
    await expect(canvas.queryByRole('button', { name: /^Delete from Para/ })).toBeNull();
  },
};

/** Walked the whole way: the foot in place of a vehicle. */
export const WalkedAllTheWay: Story = {
  args: {
    recording: { ...recording, modes: [{ time: T0, to: 'walk' }], rideKind: null },
    facts: { ...FACTS, distanceM: 850, isWalkOnly: true },
  },
};

/** Long names wrap; they are never cut. */
export const LongNames: Story = {
  args: {
    recording: {
      ...recording,
      startPointName: 'SM City Fairview, the terminal behind the Regalado Avenue entrance',
      endPointName: 'Quezon Memorial Circle, the jeepney stop under the footbridge',
    },
  },
};

/** No picture and no trail: an upload from another phone, the plain ground in the picture's place. */
export const NoPicture: Story = {
  args: {
    facts: { ...FACTS, trail: null },
    actions: { canUpload: false, isOnPhone: false, canDeleteFromPara: true, isBusy: false },
  },
};

/** ⋮ open: only what applies to an uploaded recording kept here, the deletes in red. */
export const MenuOpen: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: /More actions/ }));
    await expect(canvas.getByRole('button', { name: /^Download recording/ })).toBeInTheDocument();
    await expect(canvas.getByRole('button', { name: /^Delete from Para/ })).toBeInTheDocument();
    await expect(
      canvas.getByRole('button', { name: /^Remove from this phone/ }),
    ).toBeInTheDocument();
  },
};

/** Each delete asks first, and Keep it hands focus back to ⋮. */
export const AskingBeforeRemove: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: /More actions/ }));
    await userEvent.click(canvas.getByRole('button', { name: /^Remove from this phone/ }));
    await expect(canvas.getByRole('button', { name: 'Keep it' })).toHaveFocus();
    await userEvent.click(canvas.getByRole('button', { name: 'Keep it' }));
    await expect(canvas.getByRole('button', { name: /More actions/ })).toHaveFocus();
  },
};
