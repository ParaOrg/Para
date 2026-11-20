import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';

import { cn } from '@/shared/utils/cn';

import { TripRidePills } from './trip-ride-pills';

const PHONE = { figma: 'w-98.25', small: 'w-93.75' } satisfies Record<'figma' | 'small', string>;

/** What a trip rides, at the top of its panel, on a phone-wide sheet (BottomContent, 4796:30124). */
const meta = {
  title: 'Features/Routes/TripRidePills',
  component: TripRidePills,
  parameters: { layout: 'fullscreen' },
  // The phone the sheet is on: 393 wide, as Figma draws it, or a story's own `phone`.
  decorators: [
    (Story, ctx) => (
      <div
        className={cn(
          'bg-bg-surface p-4',
          PHONE[ctx.parameters.phone === 'small' ? 'small' : 'figma'],
        )}
      >
        <Story />
      </div>
    ),
  ],
  args: { vehicle: 'Jeepney', detail: null, livery: 'jeep', estimate: { low: 30, high: 65 } },
} satisfies Meta<typeof TripRidePills>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * As Figma draws it: the jeep in its blue, and "Jeep"; beside it the hourglass and "~30–65 min",
 * which a screen reader hears as an estimate. Labels: no button, no tab stop.
 */
export const Jeep: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const pill = canvas.getByTestId('trip-mode');
    await expect(pill).toHaveTextContent('Jeep');
    await expect(canvas.queryByRole('button')).toBeNull();
    await expect(pill.tabIndex).toBe(-1);
    const time = canvas.getByTestId('trip-time');
    await expect(time).toHaveTextContent('~30–65 min');
    await expect(canvas.getByText('About 30 to 65 minutes, an estimate')).toBeInTheDocument();
  },
};

export const EJeep: Story = { args: { vehicle: 'E-Jeep', livery: 'ejeep' } };

export const Bus: Story = { args: { vehicle: 'Bus', livery: 'bus' } };

export const UvExpress: Story = { args: { vehicle: 'UV Express', livery: 'uv-express' } };

export const Ferry: Story = { args: { vehicle: 'Ferry', livery: 'ferry' } };

/** A train: its line and its bound, "LRT 1 · Northbound". */
export const Lrt1: Story = {
  args: { vehicle: 'LRT-1', detail: 'Northbound', livery: 'light-rail-way-one' },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByTestId('trip-mode')).toHaveTextContent(
      'LRT 1 · Northbound',
    );
  },
};

export const Lrt2: Story = {
  args: { vehicle: 'LRT-2', detail: 'Eastbound', livery: 'light-rail-way-two' },
};

export const Mrt3: Story = {
  args: { vehicle: 'MRT-3', detail: 'Southbound', livery: 'metro-rail-way-three' },
};

/** A loop: its mode and its name, "Jeep · UP – Ikot", as a line names its bound. */
export const Loop: Story = {
  args: { detail: 'UP – Ikot' },
  play: async ({ canvasElement }) => {
    const pill = within(canvasElement).getByTestId('trip-mode');
    await expect(pill).toHaveTextContent('Jeep · UP – Ikot');
    await expect(pill).not.toHaveTextContent(/Papunta|Pabalik/);
  },
};

/** A long loop name on a 375-wide phone: the pill's words wrap inside it, centred. */
export const LongLoopOnSmallPhone: Story = {
  args: { detail: 'UP – Ikot via Katipunan, C.P. Garcia and Commonwealth' },
  parameters: { phone: 'small' },
};

/** No estimate given: the mode pill takes the whole row alone. */
export const WithoutTime: Story = {
  args: { estimate: undefined },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).queryByTestId('trip-time')).toBeNull();
  },
};

/** A long ride's wide range and a train's line side by side, on a 375-wide phone. */
export const LongRangeOnSmallPhone: Story = {
  args: {
    vehicle: 'LRT-1',
    detail: 'Northbound',
    livery: 'light-rail-way-one',
    estimate: { low: 80, high: 145 },
  },
  parameters: { phone: 'small' },
};
