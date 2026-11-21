import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';

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
    routeOrigin: 'B. Silang Kanan Ph 5',
    routeDirection: 'SM Fairview',
    via: 'Maligaya',
    way: 'Pabalik',
    isSwitchable: true,
    onSwitch: fn(),
  },
} satisfies Meta<typeof TripEndsCard>;

export default meta;
type Story = StoryObj<typeof meta>;

/** As Figma draws it (4796:33202): the Start card, the End card with its via line, ⇅ between. */
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Start')).toBeVisible();
    await expect(canvas.getByText('End')).toBeVisible();
    await expect(canvas.getByText('B. Silang Kanan Ph 5')).toBeVisible();
    await expect(canvas.getByText('via Maligaya')).toBeVisible();
    // The place in Bold 18/26.
    const place = getComputedStyle(canvas.getByText('SM Fairview'));
    await expect(place.fontSize).toBe('18px');
    await expect(place.lineHeight).toBe('26px');
  },
};

/** ⇅ pressed: the trip turns round. */
export const SwitchPressed: Story = {
  play: async ({ args, canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Pabalik' }));
    await expect(args.onSwitch).toHaveBeenCalledTimes(1);
  },
};

/** No via known yet: End holds its place alone. */
export const WithoutVia: Story = {
  args: { via: undefined },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).queryByText(/^via /)).toBeNull();
  },
};

/** The other way round has nothing drawn: ⇅ rests disabled. */
export const NotSwitchable: Story = {
  args: { isSwitchable: false },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole('button', { name: 'Pabalik' })).toBeDisabled();
  },
};

/** A loop: no way back, so the Start card alone and no ⇅. */
export const Loop: Story = {
  args: { routeOrigin: 'UP Diliman', routeDirection: 'UP Diliman', via: undefined, way: null },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.queryByTestId('trip-ends-switch')).toBeNull();
    await expect(canvas.queryByText('End')).toBeNull();
  },
};

/** A train's ends, and its other bound on ⇅. */
export const Train: Story = {
  args: {
    routeOrigin: 'Fernando Poe Jr.',
    routeDirection: 'Dr. Santos',
    via: undefined,
    way: 'Northbound',
  },
};

const longOrigin = 'Novaliches (Bayan) via Zabarte and Quirino Highway';

/** Long names wrap, the Start card's clear of ⇅. */
export const LongNames: Story = {
  args: {
    routeOrigin: longOrigin,
    routeDirection: 'Fairview Terraces Transport Terminal, Quirino Highway',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText(longOrigin).getBoundingClientRect().height).toBeGreaterThan(26);
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
    await waitFor(() => expect(origin.getBoundingClientRect().height).toBe(26));
  },
};
