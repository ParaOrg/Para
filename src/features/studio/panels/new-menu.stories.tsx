import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import type { ComponentProps } from 'react';
import { expect, fn, userEvent, within } from 'storybook/test';

import { NewMenu } from './new-menu';

const meta = {
  title: 'Features/Studio/NewMenu',
  component: NewMenu,
  // The menu sits at the map's bottom right, in the workshop's @container. The
  // `phone` parameter gives it a handset's width, as card-actions.stories.tsx does.
  decorators: [
    (Story, ctx) => (
      <div
        className={
          ctx.parameters.phone
            ? '@container relative h-96 w-[390px] bg-surface-quaternary'
            : '@container relative h-96 bg-surface-quaternary'
        }
      >
        <Story />
      </div>
    ),
  ],
  parameters: { layout: 'fullscreen' },
  args: {
    isReady: true,
    isOpen: false,
    onOpenChange: fn(),
    onNewRoute: fn(),
    onNewHotspot: fn(),
  },
} satisfies Meta<typeof NewMenu>;

export default meta;
type Story = StoryObj<typeof meta>;

const PLUS = { name: 'New route, terminal or hintuan' };

/** Closed: the Brand + alone. Pressing it asks the workshop to open the menu. */
export const Closed: Story = {
  play: async ({ canvasElement, args }) => {
    const plus = within(canvasElement).getByRole('button', PLUS);
    await expect(plus).toHaveAttribute('aria-expanded', 'false');
    await userEvent.click(plus);
    await expect(args.onOpenChange).toHaveBeenCalledWith(true);
  },
};

/** Open, as Figma 4300:20889 draws it: Routes, Terminal and Hintuan beside the +. */
export const Open: Story = {
  args: { isOpen: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('button', PLUS)).toHaveAttribute('aria-expanded', 'true');
    await expect(canvas.getAllByRole('menuitem')).toHaveLength(3);
    await expect(canvas.getByRole('menuitem', { name: /Routes/ })).toHaveFocus();
  },
};

/** Routes picked: the menu closes and a route's drawing starts. */
export const PickRoute: Story = {
  args: { isOpen: true },
  play: async ({ canvasElement, args }) => {
    await userEvent.click(within(canvasElement).getByRole('menuitem', { name: /Routes/ }));
    await expect(args.onOpenChange).toHaveBeenCalledWith(false);
    await expect(args.onNewRoute).toHaveBeenCalledOnce();
  },
};

/** Terminal picked: the menu closes and a terminal's outline starts. */
export const PickTerminal: Story = {
  args: { isOpen: true },
  play: async ({ canvasElement, args }) => {
    await userEvent.click(within(canvasElement).getByRole('menuitem', { name: /Terminal/ }));
    await expect(args.onOpenChange).toHaveBeenCalledWith(false);
    await expect(args.onNewHotspot).toHaveBeenCalledWith('terminal');
  },
};

/** Hintuan picked: the menu closes and a hintuan's outline starts. */
export const PickHintuan: Story = {
  args: { isOpen: true },
  play: async ({ canvasElement, args }) => {
    await userEvent.click(within(canvasElement).getByRole('menuitem', { name: /Hintuan/ }));
    await expect(args.onOpenChange).toHaveBeenCalledWith(false);
    await expect(args.onNewHotspot).toHaveBeenCalledWith('hintuan');
  },
};

/**
 * By keyboard, with the workshop's state: Enter opens, the arrows move, Enter
 * picks; Escape closes and hands focus back to the +.
 */
export const Keyboard: Story = {
  render: (args) => <StatefulNewMenu {...args} />,
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const plus = canvas.getByRole('button', PLUS);
    plus.focus();
    await userEvent.keyboard('{Enter}');
    await expect(canvas.getByRole('menuitem', { name: /Routes/ })).toHaveFocus();
    await userEvent.keyboard('{ArrowUp}');
    await expect(canvas.getByRole('menuitem', { name: /Hintuan/ })).toHaveFocus();
    await userEvent.keyboard('{Escape}');
    await expect(canvas.queryByRole('menu')).toBeNull();
    await expect(plus).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    await userEvent.keyboard('{ArrowDown}');
    await userEvent.keyboard('{Enter}');
    await expect(args.onNewHotspot).toHaveBeenCalledWith('terminal');
  },
};

/** Before the map has loaded: the + rests, since there is nothing to draw on. */
export const NotReady: Story = {
  args: { isReady: false },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole('button', PLUS)).toBeDisabled();
  },
};

/** At phone width, open: the menu narrows to the map's width beside the +. */
export const Phone: Story = {
  args: { isOpen: true },
  parameters: { phone: true },
  play: async ({ canvasElement }) => {
    const menu = within(canvasElement).getByRole('menu');
    await expect(menu.getBoundingClientRect().width).toBeLessThanOrEqual(390 - 5.25 * 16);
  },
};

/** NewMenu holding its own open state, as the workshop does. */
function StatefulNewMenu(props: ComponentProps<typeof NewMenu>) {
  const [isOpen, setIsOpen] = useState(false);
  return <NewMenu {...props} isOpen={isOpen} onOpenChange={setIsOpen} />;
}
