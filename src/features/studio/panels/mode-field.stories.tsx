import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { ModeField } from './mode-field';

const meta = {
  title: 'Features/Studio/ModeField',
  component: ModeField,
  // At the sidebar's width, 348 inside its 16 each side.
  decorators: [
    (Story) => (
      <div className="w-95 bg-surface p-4">
        <Story />
      </div>
    ),
  ],
  parameters: { layout: 'padded' },
  args: { mode: 'jeepney', isLocked: false, onChange: fn() },
} satisfies Meta<typeof ModeField>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A new jeepney route: the lines and P2P are left out of the choices. Picking one hands it back. */
export const Jeepney: Story = {
  play: async ({ args, canvasElement }) => {
    const mode = within(canvasElement).getByRole('combobox', { name: 'Transportation mode' });
    await expect(mode).toBeEnabled();
    await expect(within(mode).queryByRole('option', { name: 'Ferry' })).toBeNull();
    await expect(within(mode).queryByRole('option', { name: 'P2P bus' })).toBeNull();
    await userEvent.selectOptions(mode, 'UV Express');
    await expect(args.onChange).toHaveBeenCalledWith('uv_express');
  },
};

/** A route saved as P2P before it was retired: its mode shows, and Bus is there to switch to. */
export const SavedAsP2P: Story = {
  args: { mode: 'p2p' },
  play: async ({ args, canvasElement }) => {
    const mode = within(canvasElement).getByRole('combobox', { name: 'Transportation mode' });
    await expect(mode).toHaveValue('p2p');
    await expect(mode).toBeEnabled();
    await userEvent.selectOptions(mode, 'Bus');
    await expect(args.onChange).toHaveBeenCalledWith('bus');
  },
};

/** A train line, imported with its line named: its Transportation mode stays. */
export const Train: Story = {
  args: { mode: 'lrt' },
  play: async ({ canvasElement }) => {
    const mode = within(canvasElement).getByRole('combobox', { name: 'Transportation mode' });
    await expect(mode).toBeDisabled();
  },
};

/** A return trip's route: its mode, shown and locked. */
export const Locked: Story = {
  args: { isLocked: true },
  play: async ({ canvasElement }) => {
    const mode = within(canvasElement).getByRole('combobox', { name: 'Transportation mode' });
    await expect(mode).toBeDisabled();
  },
};
