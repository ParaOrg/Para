import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { RouteFields } from './route-fields';

const meta = {
  title: 'Features/Studio/RouteFields',
  component: RouteFields,
  // Inside the save panel's card, at its width. The `phone` parameter puts it
  // at a handset's width, as card-actions.stories.tsx does.
  decorators: [
    (Story, ctx) => (
      <div className={ctx.parameters.phone ? 'w-[390px] bg-surface p-6' : 'w-md bg-surface p-6'}>
        <Story />
      </div>
    ),
  ],
  parameters: { layout: 'padded' },
  args: {
    signboard: '',
    mode: 'jeepney',
    fareNote: '',
    isLocked: false,
    onSignboardChange: fn(),
    onModeChange: fn(),
    onFareNoteChange: fn(),
  },
} satisfies Meta<typeof RouteFields>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A new jeepney route: every field open, the lines left out of the Mode. */
export const Jeepney: Story = {
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    const mode = canvas.getByRole('combobox', { name: /Mode/ });
    await expect(mode).toBeEnabled();
    await expect(within(mode).queryByRole('option', { name: 'Ferry' })).toBeNull();
    await userEvent.selectOptions(mode, 'UV Express');
    await expect(args.onModeChange).toHaveBeenCalledWith('uv_express');
  },
};

/** An ikot is called by its signboard: the field says it is required. */
export const IkotSignboardRequired: Story = {
  args: { isSignboardRequired: true },
  play: async ({ canvasElement }) => {
    const signboard = within(canvasElement).getByRole('textbox', { name: /Signboard/ });
    await expect(signboard).toHaveAttribute('aria-required', 'true');
    await expect(signboard).toHaveAttribute('placeholder', 'UP – Ikot');
  },
};

/** A train line, imported with its line named: its Mode stays, the rest may change. */
export const Train: Story = {
  args: { mode: 'lrt', signboard: 'LRT-1', fareNote: '₱15 to ₱35 by distance' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('combobox', { name: /Mode/ })).toBeDisabled();
    await expect(canvas.getByRole('textbox', { name: /Signboard/ })).toBeEnabled();
  },
};

/** A return trip's: the route's facts, shown and locked. */
export const Locked: Story = {
  args: { signboard: 'Fairview – Tala', fareNote: '₱13 first 4 km', isLocked: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('textbox', { name: /Signboard/ })).toBeDisabled();
    await expect(canvas.getByRole('combobox', { name: /Mode/ })).toBeDisabled();
    await expect(canvas.getByRole('textbox', { name: /Fare note/ })).toBeDisabled();
  },
};

/**
 * A long signboard and fare note at a phone's width, where Mode and Fare note
 * stack and the fields read 16 px: both follow the viewport, not this box.
 */
export const Phone: Story = {
  args: {
    signboard: 'SM City Fairview – Novaliches Bayan via Quirino Highway and Regalado Avenue',
    fareNote: '₱13 first 4 km, ₱1.80 each km after; students, seniors and PWDs 20% off',
  },
  parameters: { phone: true },
  globals: { viewport: { value: 'mobile1', isRotated: false } },
};
