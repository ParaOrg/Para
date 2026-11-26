import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { ListTopBar } from './list-top-bar';

/**
 * The bar over a route list at the top (4885:42122), on a phone's map, 393 wide: the list stands
 * in as a bare sheet marked as BottomSheet marks a list at its top, filling the map.
 */
const meta = {
  title: 'App/PublicMap/ListTopBar',
  component: ListTopBar,
  args: {
    way: { way: 'Papunta', wayTo: 'Pabalik', isSwitchable: true },
    isBack: false,
    onFlip: fn(),
    onMiddle: fn(),
  },
  decorators: [
    (Story) => (
      <div className="group/map @container relative h-160 w-98.25 overflow-hidden bg-bg-surface-secondary">
        <div
          data-testid="chooser"
          data-snap="full"
          data-reaches-top=""
          className="absolute inset-0 bg-brand-surface"
        />
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ListTopBar>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Vice Versa at the left and ⌄ at the right, 16 in and 24 up; ⌄ asks for the middle. */
export const AtTheTop: Story = {
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    const host = canvasElement.querySelector('.group\\/map')?.getBoundingClientRect();
    const flip = canvas.getByRole('button', { name: 'Vice Versa' }).getBoundingClientRect();
    const down = canvas.getByRole('button', { name: 'Down to the middle' });
    const box = down.getBoundingClientRect();
    await expect(host).toBeDefined();
    if (host) {
      await expect(Math.round(flip.left - host.left)).toBe(16);
      await expect(Math.round(host.right - box.right)).toBe(16);
      await expect(Math.round(host.bottom - box.bottom)).toBe(24);
    }
    await userEvent.click(down);
    await expect(args.onMiddle).toHaveBeenCalledOnce();
  },
};

/** Only loops listed: no way back, so ⌄ alone. */
export const OnlyLoops: Story = {
  args: { way: null },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.queryByRole('button', { name: 'Vice Versa' })).toBeNull();
    await expect(canvas.getByRole('button', { name: 'Down to the middle' })).toBeVisible();
  },
};
