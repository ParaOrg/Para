import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { NewPlaceForm } from './new-place-form';

const meta = {
  title: 'Features/Studio/NewPlaceForm',
  component: NewPlaceForm,
  decorators: [
    (Story) => (
      <div className="w-[28rem] max-w-full bg-white p-6">
        <Story />
      </div>
    ),
  ],
  args: {
    end: 'Head',
    centre: [121.0432, 14.7589],
    defaultKind: 'terminal',
    hotspots: [],
    directions: [],
    onSaved: fn(),
    onCancel: fn(),
  },
} satisfies Meta<typeof NewPlaceForm>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The head: a Terminal, where the jeeps wait; focus starts on the ground name; Escape asks to close. */
export const Head: Story = {
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByLabelText(/Ground name/)).toHaveFocus();
    await expect(canvas.getByLabelText('Terminal')).toBeChecked();
    await userEvent.keyboard('{Escape}');
    await expect(args.onCancel).toHaveBeenCalledOnce();
  },
};

/** The tail: a Hintuan, since a route's far end can be one. */
export const Tail: Story = {
  args: { end: 'Tail', defaultKind: 'hintuan' },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByLabelText('Hintuan')).toBeChecked();
  },
};

/** An empty ground name is refused in words, without a write. */
export const NameMissing: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(canvas.getByLabelText(/Stop name/), 'Tala');
    await userEvent.keyboard('{Enter}');
    await expect(await canvas.findByRole('alert')).toHaveTextContent(/name written on the ground/);
  },
};
