import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { NewButtons } from './new-buttons';

const meta = {
  title: 'Features/Studio/NewButtons',
  component: NewButtons,
  // The buttons sit at the map's bottom right. The `phone` parameter gives
  // them a handset's width, as card-actions.stories.tsx does.
  decorators: [
    (Story, ctx) => (
      <div
        className={
          ctx.parameters.phone
            ? 'relative h-96 w-[390px] bg-surface-quaternary'
            : 'relative h-96 bg-surface-quaternary'
        }
      >
        <Story />
      </div>
    ),
  ],
  parameters: { layout: 'fullscreen' },
  args: {
    ready: true,
    menu: false,
    setMenu: fn(),
    onNewRoute: fn(),
    onNewHotspot: fn(),
  },
} satisfies Meta<typeof NewButtons>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The map is there: + New Route draws, + New hotspot opens its menu. */
export const Ready: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: '+ New Route' }));
    await expect(args.onNewRoute).toHaveBeenCalledOnce();
    const hotspot = canvas.getByRole('button', { name: '+ New hotspot' });
    await expect(hotspot).toHaveAttribute('aria-expanded', 'false');
    await userEvent.click(hotspot);
    await expect(args.setMenu).toHaveBeenCalledOnce();
  },
};

/** The hotspot menu open: a terminal or a hintuan. Picking one closes the menu and starts it. */
export const MenuOpen: Story = {
  args: { menu: true },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('button', { name: '+ New hotspot' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    await userEvent.click(canvas.getByRole('menuitem', { name: /Hintuan/ }));
    await expect(args.setMenu).toHaveBeenCalledWith(false);
    await expect(args.onNewHotspot).toHaveBeenCalledWith('hintuan');
  },
};

/** Before the map has loaded: both buttons rest, since there is nothing to draw on. */
export const NotReady: Story = {
  args: { ready: false },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('button', { name: '+ New Route' })).toBeDisabled();
    await expect(canvas.getByRole('button', { name: '+ New hotspot' })).toBeDisabled();
  },
};

/** At phone width, the menu open. */
export const Phone: Story = { args: { menu: true }, parameters: { phone: true } };
