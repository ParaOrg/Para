import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { StopNoteSheet } from './stop-note-sheet';

const meta = {
  title: 'Features/Contribute/StopNoteSheet',
  component: StopNoteSheet,
  args: { note: '', onSave: fn(), onClose: fn() },
  decorators: [
    (Story) => (
      <div className="relative h-[852px] w-[393px] overflow-hidden bg-surface-quaternary">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof StopNoteSheet>;

export default meta;
type Story = StoryObj<typeof meta>;

/** As it opens from Add a note: the field empty and focused, so the keyboard comes up. */
export const Empty: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const field = canvas.getByRole('textbox', { name: 'How do you describe this stop' });
    await expect(field).toHaveFocus();
    await userEvent.type(field, 'Corner of Aurora, near the church');
    await userEvent.click(canvas.getByRole('button', { name: 'Save' }));
    await expect(args.onSave).toHaveBeenCalledWith('Corner of Aurora, near the church');
  },
};

/** A flag that has a note: it opens with it, ready to change. */
export const WithNote: Story = { args: { note: 'Tapat ng 7-Eleven, may waiting shed' } };

/** The longest note it keeps: 200 characters, and no more can be typed. */
export const LongNote: Story = { args: { note: 'Sa may kanto, '.repeat(14).slice(0, 200) } };

/** ✕ closes it with nothing kept. */
export const Closed: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.type(canvas.getByRole('textbox'), 'Not this one');
    await userEvent.click(canvas.getByRole('button', { name: 'Close' }));
    await expect(args.onClose).toHaveBeenCalledOnce();
    await expect(args.onSave).not.toHaveBeenCalled();
  },
};
