import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, within } from 'storybook/test';

import { MapCreditsDock } from './map-credits-dock';

const meta = {
  title: 'Features/Routes/MapCreditsDock',
  component: MapCreditsDock,
  // A phone-sized map: the dock host the card's sheet writes its top into (`--dock-y`), here
  // held at 480 of 720, where a sheet raised to the framed height (55%) would stand.
  decorators: [
    (Story) => (
      <div
        data-dock-host
        className="@container relative h-180 w-97.5 overflow-clip bg-surface-secondary [--dock-y:30rem]"
      >
        <Story />
      </div>
    ),
  ],
  parameters: { layout: 'centered' },
  args: { isDocked: false, onOpen: fn(), buttonRef: { current: null } },
} satisfies Meta<typeof MapCreditsDock>;

export default meta;
type Story = StoryObj<typeof meta>;

/** No card open: at the map's bottom left, 12 in, clear of the home bar. */
export const AtTheMapsFoot: Story = {};

/** A card open: 12 over the card's sheet, following its top. */
export const OverAnOpenCard: Story = { args: { isDocked: true } };

/**
 * The public map's: in the map's top-left corner, 16 in and 24 down, over a card's sheet even at
 * full height (it stays reachable), wherever the card is.
 */
export const InTheTopLeftCorner: Story = {
  args: { corner: 'top-left', isDocked: true },
  play: async ({ canvasElement }) => {
    const host = canvasElement.querySelector('[data-dock-host]')?.getBoundingClientRect();
    const button = within(canvasElement).getByRole('button').getBoundingClientRect();
    await expect(host).toBeDefined();
    if (host) {
      await expect(Math.round(button.left - host.left)).toBe(16);
      await expect(Math.round(button.top - host.top)).toBe(24);
    }
  },
};
