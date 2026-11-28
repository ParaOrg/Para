import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { AddRouteMenu } from './add-route-menu';

const meta = {
  title: 'Features/Studio/AddRouteMenu',
  component: AddRouteMenu,
  // Where the route line detail's tabs stand, with room under it for the menu.
  decorators: [
    (Story) => (
      <div className="h-56 w-md bg-surface p-4 font-sn-pro">
        <Story />
      </div>
    ),
  ],
  parameters: { layout: 'padded' },
  args: { onChoose: fn() },
} satisfies Meta<typeof AddRouteMenu>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Closed: the tab's words alone, as a button that opens a menu. */
export const Closed: Story = {
  play: async ({ canvasElement }) => {
    const button = within(canvasElement).getByRole('button', { name: '+ Add route' });
    await expect(button).toHaveAttribute('aria-haspopup', 'menu');
    await expect(button).toHaveAttribute('aria-expanded', 'false');
  },
};

/** Open: its three ways, lined up with the tab's left edge; Escape closes it and keeps focus. */
export const Open: Story = {
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    const button = canvas.getByRole('button', { name: '+ Add route' });
    await userEvent.click(button);
    await expect(canvas.getAllByRole('menuitem')).toHaveLength(3);
    await userEvent.keyboard('{Escape}');
    await expect(canvas.queryByRole('menu')).toBeNull();
    await expect(button).toHaveFocus();
    await expect(args.onChoose).not.toHaveBeenCalled();
    await userEvent.click(button);
  },
};

/** An old Para route picked: the menu closes and says which. */
export const PickOldPara: Story = {
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: '+ Add route' }));
    await userEvent.click(canvas.getByRole('menuitem', { name: 'Start from an old Para route' }));
    await expect(args.onChoose).toHaveBeenCalledWith('old-para');
    await expect(canvas.queryByRole('menu')).toBeNull();
  },
};
