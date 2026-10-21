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
    isLocked: false,
    onSignboardChange: fn(),
    onModeChange: fn(),
  },
} satisfies Meta<typeof RouteFields>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A new jeepney route: the Mode alone, the lines left out of it; no signboard or fare note. */
export const Jeepney: Story = {
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.queryByRole('textbox')).toBeNull();
    const mode = canvas.getByRole('combobox', { name: /Mode/ });
    await expect(mode).toBeEnabled();
    await expect(within(mode).queryByRole('option', { name: 'Ferry' })).toBeNull();
    await userEvent.selectOptions(mode, 'UV Express');
    await expect(args.onModeChange).toHaveBeenCalledWith('uv_express');
  },
};

/** An ikot is called by its signboard: the field shows, and says it is required. */
export const IkotSignboardRequired: Story = {
  args: { isSignboardRequired: true },
  play: async ({ canvasElement }) => {
    const signboard = within(canvasElement).getByRole('textbox', { name: /Signboard/ });
    await expect(signboard).toHaveAttribute('aria-required', 'true');
    await expect(signboard).toHaveAttribute('placeholder', 'UP – Ikot');
  },
};

/** A train line, imported with its line named: its Mode stays. */
export const Train: Story = {
  args: { mode: 'lrt', signboard: 'LRT-1' },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole('combobox', { name: /Mode/ })).toBeDisabled();
  },
};

/** A return trip's ikot: the route's facts, shown and locked. */
export const Locked: Story = {
  args: { signboard: 'UP – Ikot', isSignboardRequired: true, isLocked: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('textbox', { name: /Signboard/ })).toBeDisabled();
    await expect(canvas.getByRole('combobox', { name: /Mode/ })).toBeDisabled();
  },
};

/** A long ikot signboard at a phone's width: the fields read 16 px, following the viewport. */
export const Phone: Story = {
  args: {
    signboard: 'UP Diliman – Ikot via Katipunan, C.P. Garcia and the Academic Oval',
    isSignboardRequired: true,
  },
  parameters: { phone: true },
  globals: { viewport: { value: 'mobile1', isRotated: false } },
};
