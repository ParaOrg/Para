import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { RideDetailScreen } from './ride-detail-screen';
import type { Recording } from '../storage/recording-schema';

const T0 = Date.UTC(2026, 0, 25, 0, 0, 0);
const recording: Recording = {
  version: 2,
  id: '11111111-0000-4000-8000-000000000001',
  status: 'saved',
  startedAt: T0,
  stoppedAt: T0 + 52 * 60_000,
  savedAt: T0 + 53 * 60_000,
  gaps: [],
  modes: [{ time: T0, to: 'ride' }],
  startPointName: 'Cubao via Marcos Highway',
  endPointName: 'Cogeo',
  description: '',
  rideKind: 'Jeep',
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
  args: { recording, onBack: fn() },
} satisfies Meta<typeof RideDetailScreen>;

export default meta;
type Story = StoryObj<typeof meta>;

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

/** A long name wraps, and so does where it went. */
export const LongNames: Story = {
  args: {
    recording: {
      ...recording,
      startPointName:
        'SM City Fairview Jeepney Terminal via Commonwealth Avenue and Quirino Highway',
      endPointName: 'LRT-2 Araneta Center–Cubao Station, the stairs by Gateway Mall',
    },
  },
};

/** Saved with no end named: the name alone. */
export const NoEnd: Story = {
  args: { recording: { ...recording, endPointName: '' } },
};

/** Reloaded on its address while History is still finding it: Back alone over the map. */
export const Finding: Story = {
  args: { recording: null },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('button', { name: 'Back' })).toBeInTheDocument();
    await expect(canvas.queryByRole('heading')).toBeNull();
  },
};
