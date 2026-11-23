import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { IkotNameField } from './ikot-name-field';

const meta = {
  title: 'Features/Studio/IkotNameField',
  component: IkotNameField,
  // At the sidebar's width, 348 inside its 16 each side. The `phone` parameter puts it at a
  // handset's width.
  decorators: [
    (Story, ctx) => (
      <div className={ctx.parameters.phone ? 'w-97.5 bg-surface p-6' : 'w-95 bg-surface p-4'}>
        <Story />
      </div>
    ),
  ],
  parameters: { layout: 'padded' },
  args: { value: '', isLocked: false, onChange: fn() },
} satisfies Meta<typeof IkotNameField>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Empty: required, with what a name looks like. Typing hands back the name. */
export const Empty: Story = {
  play: async ({ args, canvasElement }) => {
    const field = within(canvasElement).getByRole('textbox', { name: 'Ikot name' });
    await expect(field).toHaveAttribute('aria-required', 'true');
    await expect(field).toHaveAttribute('placeholder', 'UP – Ikot');
    await userEvent.type(field, 'U');
    await expect(args.onChange).toHaveBeenCalledWith('U');
  },
};

/** A return trip's ikot: the route's name, shown and locked. */
export const Locked: Story = {
  args: { value: 'UP – Ikot', isLocked: true },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole('textbox', { name: 'Ikot name' })).toBeDisabled();
  },
};

/** A long Ikot name at a phone's width: the field reads 16 px, following the viewport. */
export const Phone: Story = {
  args: { value: 'UP Diliman – Ikot via Katipunan, C.P. Garcia and the Academic Oval' },
  parameters: { phone: true },
  globals: { viewport: { value: 'mobile1', isRotated: false } },
};
