import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { CardActions } from './card-actions';

const meta = {
  title: 'Features/Studio/CardActions',
  component: CardActions,
  parameters: { layout: 'padded' },
  // The row as both cards lay their `actions` slot out: `flex gap-2`.
  decorators: [
    (Story) => (
      <div className="flex w-[369px] gap-2 bg-surface p-3">
        <Story />
      </div>
    ),
  ],
  args: {
    editLabel: 'Edit route',
    onEdit: fn(),
    onExtend: fn(),
    onDelete: fn(),
  },
} satisfies Meta<typeof CardActions>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A drawn direction under its trip card: Edit Primary, Extend Secondary, Delete Error. */
export const DrawnRoute: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Edit route' }));
    await userEvent.click(canvas.getByRole('button', { name: 'Extend' }));
    await userEvent.click(canvas.getByRole('button', { name: 'Delete' }));
    await expect(args.onEdit).toHaveBeenCalledOnce();
    await expect(args.onExtend).toHaveBeenCalledOnce();
    await expect(args.onDelete).toHaveBeenCalledOnce();
  },
};

/** A slot, a direction with no line yet: nothing to extend, so no Extend. */
export const Slot: Story = {
  args: { onExtend: undefined },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).queryByRole('button', { name: 'Extend' })).toBeNull();
  },
};

/** Under a hotspot's card: the longest label the apps pass, and never Extend. */
export const Terminal: Story = { args: { editLabel: 'Edit terminal', onExtend: undefined } };

/** At phone width, inside a card over the map, as the studio shows it on a phone. */
export const Phone: Story = {
  decorators: [
    (Story) => (
      <div className="@container w-[390px] bg-surface-quaternary p-3">
        <div className="flex gap-2 rounded-xl bg-surface p-4">
          <Story />
        </div>
      </div>
    ),
  ],
};
