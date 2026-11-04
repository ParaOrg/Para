import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import type { CardStatus } from './card-status';
import { RideDetailScreen, type RideDetail } from './ride-detail-screen';
import type { Recording } from '../storage/recording-schema';

const T0 = Date.UTC(2026, 0, 25, 0, 0, 0);
const recording: Recording = {
  version: 2,
  id: '11111111-0000-4000-8000-000000000001',
  status: 'saved',
  startedAt: T0,
  stoppedAt: T0 + (4 * 3600 + 30 * 60 + 40) * 1000,
  savedAt: T0 + 5 * 3600 * 1000,
  gaps: [],
  modes: [{ time: T0, to: 'ride' }],
  startPointName: 'Cubao via Marcos Highway',
  endPointName: 'Cogeo',
  description:
    'Jeep with the signboard “Cogeo – Cubao”. From Cubao east along Aurora Blvd past Anonas and ' +
    'Katipunan, then onto Marcos Highway toward Masinag, ending at the Cogeo terminal.',
  rideKind: 'Jeep',
  farePhp: 30,
  distanceM: 12_700,
};

const UPLOADED: CardStatus = { tone: 'uploaded', words: 'Uploaded' };
const RETRY: CardStatus = { tone: 'retry', words: 'Tap retry upload' };

const ride: RideDetail = {
  recording,
  facts: { distanceM: 12_700, isWalkOnly: false, trail: null },
  status: UPLOADED,
  onRetry: fn(),
};

const meta = {
  title: 'Features/Contribute/RideDetailScreen',
  component: RideDetailScreen,
  // The screen stands over the page's map: a phone-sized box marked `@container` and
  // `data-dock-host`, as the contributor page is, the map's grey in its place.
  decorators: [
    (Story) => (
      <div
        data-dock-host
        className="@container relative h-[852px] w-[393px] overflow-clip bg-surface-quaternary"
      >
        <Story />
      </div>
    ),
  ],
  parameters: { layout: 'fullscreen' },
  args: { ride, onBack: fn() },
} satisfies Meta<typeof RideDetailScreen>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Raises the sheet to Max, as a contributor pulling it up would, by its handle. */
async function openSheet(canvasElement: HTMLElement) {
  const canvas = within(canvasElement);
  await userEvent.click(canvas.getByTestId('dock-handle'));
  await userEvent.click(canvas.getByTestId('dock-handle'));
}

/** Folded, as Figma draws it (4558:11792): the name, where it went, Back above the sheet. */
export const Folded: Story = {
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByRole('heading', { name: 'Cubao via Marcos Highway' }),
    ).toBeInTheDocument();
    await expect(canvas.getByText('Cogeo')).toBeInTheDocument();
    await userEvent.click(canvas.getByRole('button', { name: 'Back' }));
    await expect(args.onBack).toHaveBeenCalledTimes(1);
  },
};

/** Pulled up (4560:12422): Commute Information, five rows, and the Description. */
export const Open: Story = {
  play: async ({ canvasElement }) => {
    await openSheet(canvasElement);
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('heading', { name: 'Commute Information' })).toBeVisible();
    await expect(canvas.getByText('4 hr 30 mins and 40 secs')).toBeInTheDocument();
    await expect(canvas.getByText('Jan 25, 2026')).toBeInTheDocument();
    await expect(canvas.getByText('12.7 km')).toBeInTheDocument();
    await expect(canvas.getByRole('heading', { name: 'Description' })).toBeInTheDocument();
  },
};

/** An upload that failed: the line is the retry button, as on its card. */
export const RetryUpload: Story = {
  args: { ride: { ...ride, status: RETRY } },
  play: async ({ args, canvasElement }) => {
    await openSheet(canvasElement);
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: /^Tap retry upload/ }));
    await expect(args.ride?.onRetry).toHaveBeenCalledTimes(1);
  },
};

/** Saved with no vehicle, fare or description: those rows and the heading are left out. */
export const NothingTyped: Story = {
  args: {
    ride: {
      ...ride,
      recording: { ...recording, rideKind: null, farePhp: undefined, description: '' },
    },
  },
  play: async ({ canvasElement }) => {
    await openSheet(canvasElement);
    const canvas = within(canvasElement);
    await expect(canvas.queryByText('Fare')).toBeNull();
    await expect(canvas.queryByText('Transport mode')).toBeNull();
    await expect(canvas.queryByRole('heading', { name: 'Description' })).toBeNull();
  },
};

/** Uploaded from another phone: what Para keeps of it, the fare it was sent with included. */
export const FromAnotherPhone: Story = {
  args: {
    ride: {
      ...ride,
      recording: { ...recording, farePhp: 13.5, distanceM: undefined },
      facts: { distanceM: 850, isWalkOnly: false, trail: null },
    },
  },
  play: async ({ canvasElement }) => {
    await openSheet(canvasElement);
    const canvas = within(canvasElement);
    await expect(canvas.getByText('850 m')).toBeInTheDocument();
    await expect(canvas.getByText('₱13.50')).toBeInTheDocument();
  },
};

/** Walked the whole way: Lakad in the vehicle's place. */
export const Walked: Story = {
  args: {
    ride: {
      ...ride,
      recording: { ...recording, modes: [{ time: T0, to: 'walk' }], farePhp: undefined },
      facts: { distanceM: 1_400, isWalkOnly: true, trail: null },
    },
  },
  play: async ({ canvasElement }) => {
    await openSheet(canvasElement);
    await expect(within(canvasElement).getByText('Lakad (walking)')).toBeInTheDocument();
  },
};

/** Saved, not sent yet: the quiet line, as its card says it. */
export const WaitingForSignal: Story = {
  args: { ride: { ...ride, status: { tone: 'quiet', words: 'Waiting for signal' } } },
  play: async ({ canvasElement }) => {
    await openSheet(canvasElement);
    await expect(within(canvasElement).getByText('Waiting for signal')).toBeInTheDocument();
  },
};

/** A long description wraps, and the sheet scrolls at Max. */
export const LongDescription: Story = {
  args: {
    ride: {
      ...ride,
      recording: { ...recording, description: `${recording.description} `.repeat(6).trim() },
    },
  },
  play: async ({ canvasElement }) => openSheet(canvasElement),
};

/** A long name wraps, and so does where it went. */
export const LongNames: Story = {
  args: {
    ride: {
      ...ride,
      recording: {
        ...recording,
        startPointName:
          'SM City Fairview Jeepney Terminal via Commonwealth Avenue and Quirino Highway',
        endPointName: 'LRT-2 Araneta Center–Cubao Station, the stairs by Gateway Mall',
      },
    },
  },
};

/** Saved with no end named: the name alone. */
export const NoEnd: Story = {
  args: { ride: { ...ride, recording: { ...recording, endPointName: '' } } },
};

/** Reloaded on its address while History is still finding it: Back alone over the map. */
export const Finding: Story = {
  args: { ride: null },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('button', { name: 'Back' })).toBeInTheDocument();
    await expect(canvas.queryByRole('heading')).toBeNull();
  },
};
