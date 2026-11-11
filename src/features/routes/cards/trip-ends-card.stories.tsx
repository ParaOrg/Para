import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { TripEndsCard } from './trip-ends-card';

const meta = {
  title: 'Features/Routes/TripEndsCard',
  component: TripEndsCard,
  parameters: { layout: 'fullscreen' },
  // As the trip insets it on a phone: 12 from each side of Figma's 393.
  decorators: [
    (Story) => (
      <div className="w-98.25 bg-surface px-3 py-4">
        <Story />
      </div>
    ),
  ],
  args: {
    routeOrigin: 'Tala',
    routeDirection: 'SM Fairview',
    way: 'Pabalik',
    isSwitchable: true,
    onSwitch: fn(),
  },
} satisfies Meta<typeof TripEndsCard>;

export default meta;
type Story = StoryObj<typeof meta>;

/** As Figma draws it (4680:25092): S Tala, E SM Fairview, and ⇅ between them. */
export const Default: Story = {
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Tala')).toBeVisible();
    await userEvent.click(canvas.getByRole('button', { name: 'Pabalik' }));
    await expect(args.onSwitch).toHaveBeenCalledTimes(1);
    // Rounded 24, as Figma's radius/3xl; each row 52 tall.
    const card = canvas.getByTestId('trip-ends');
    await expect(getComputedStyle(card).borderTopLeftRadius).toBe('24px');
    await expect(canvas.getByText('Tala').closest('p')?.getBoundingClientRect().height).toBe(52);
  },
};

/** The other way round has nothing drawn: ⇅ rests disabled. */
export const NotSwitchable: Story = {
  args: { isSwitchable: false },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole('button', { name: 'Pabalik' })).toBeDisabled();
  },
};

/** A loop: no way back, no ⇅. */
export const Loop: Story = {
  args: { routeOrigin: 'UP Diliman', routeDirection: 'UP Diliman', way: null },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).queryByTestId('trip-ends-switch')).toBeNull();
  },
};

/** A train's ends, and its other bound on ⇅. */
export const Train: Story = {
  args: { routeOrigin: 'Fernando Poe Jr.', routeDirection: 'Dr. Santos', way: 'Northbound' },
};

/** Long names wrap, clear of ⇅. */
export const LongNames: Story = {
  args: {
    routeOrigin: 'Fairview Teraccess Transport Terminal',
    routeDirection: 'Novaliches (Bayan) via Zabarte and Quirino Highway',
  },
};
