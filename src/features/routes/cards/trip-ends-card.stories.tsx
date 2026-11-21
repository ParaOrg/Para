import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, waitFor, within } from 'storybook/test';

import { TripEndsCard } from './trip-ends-card';

const meta = {
  title: 'Features/Routes/TripEndsCard',
  component: TripEndsCard,
  parameters: { layout: 'fullscreen' },
  // As the detail insets it: 12 from each side of Figma's 393.
  decorators: [
    (Story) => (
      <div className="w-98.25 bg-bg-surface px-3 py-4">
        <Story />
      </div>
    ),
  ],
  args: {
    routeOrigin: 'B.Silang Kanan Ph 5',
    routeDirection: 'SM Fairview',
    via: 'Maligaya',
  },
} satisfies Meta<typeof TripEndsCard>;

export default meta;
type Story = StoryObj<typeof meta>;

/** As Figma draws it (TopContent, 4796:30411): Start's place over End's and its via line, one card. */
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Start')).toBeVisible();
    await expect(canvas.getByText('End')).toBeVisible();
    await expect(canvas.getByText('B.Silang Kanan Ph 5')).toBeVisible();
    await expect(canvas.getByText('via Maligaya')).toBeVisible();
    // The place in SemiBold 20/28.
    const place = getComputedStyle(canvas.getByText('SM Fairview'));
    await expect(place.fontSize).toBe('20px');
    await expect(place.lineHeight).toBe('28px');
    await expect(place.fontWeight).toBe('600');
    // No switch on the card: the bar's PAPUNTA turns the trip round.
    await expect(canvas.queryByRole('button')).toBeNull();
  },
};

/** No via known yet: End holds its place alone. */
export const WithoutVia: Story = {
  args: { via: undefined },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).queryByText(/^via /)).toBeNull();
  },
};

/** Variants=Ikot (4825:48754): a loop's name alone, under its grey Ikot pill. */
export const Ikot: Story = {
  args: {
    routeOrigin: 'Palma Hall',
    routeDirection: 'Palma Hall',
    via: undefined,
    loopName: 'UP Ikot',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Ikot')).toBeVisible();
    await expect(canvas.getByText('UP Ikot')).toBeVisible();
    await expect(canvas.queryByText('Start')).toBeNull();
    await expect(canvas.queryByText('End')).toBeNull();
  },
};

/** A train's ends. */
export const Train: Story = {
  args: {
    routeOrigin: 'Fernando Poe Jr.',
    routeDirection: 'Dr. Santos',
    via: undefined,
  },
};

const longOrigin = 'Novaliches (Bayan) via Zabarte and Quirino Highway';

/** Long names wrap. */
export const LongNames: Story = {
  args: {
    routeOrigin: longOrigin,
    routeDirection: 'Fairview Terraces Transport Terminal, Quirino Highway',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText(longOrigin).getBoundingClientRect().height).toBeGreaterThan(28);
  },
};

/** On a phone's sheet at Low: each place keeps to one line, cut short. */
export const OnPhoneAtLow: Story = {
  args: LongNames.args,
  decorators: [
    (Story) => (
      <div className="@container w-full" data-floats="card" data-snap="low">
        <Story />
      </div>
    ),
  ],
  play: async ({ canvasElement }) => {
    const origin = within(canvasElement).getByText(longOrigin);
    await waitFor(() => expect(origin.getBoundingClientRect().height).toBe(28));
  },
};
