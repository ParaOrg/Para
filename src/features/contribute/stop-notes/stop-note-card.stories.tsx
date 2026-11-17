import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';

import { StopNoteCard } from './stop-note-card';

const meta = {
  title: 'Features/Contribute/StopNoteCard',
  component: StopNoteCard,
  args: { note: '', place: 'Near UP Diliman', onSave: fn(), onCancel: fn() },
  decorators: [
    (Story) => (
      <div className="relative h-[852px] w-[393px] overflow-hidden bg-surface-quaternary">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof StopNoteCard>;

export default meta;
type Story = StoryObj<typeof meta>;

/** As the pill opens it (4709:10936): empty, 0/200, the field focused so the keyboard comes up. */
export const Empty: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const field = canvas.getByRole('textbox', { name: 'Add a stop note' });
    await waitFor(() => expect(field).toHaveFocus());
    await expect(canvas.getByText('0/200')).toBeVisible();
    await userEvent.type(field, 'Conductor says this is montisory UP Diliman Doctors');
    await expect(canvas.getByText('51/200')).toBeVisible();
    await userEvent.click(canvas.getByRole('button', { name: 'Save' }));
    await expect(args.onSave).toHaveBeenCalledWith(
      'Conductor says this is montisory UP Diliman Doctors',
    );
  },
};

/** A stop with a note already (4709:11758): it opens with it, ready to change. */
export const WithNote: Story = {
  args: { note: 'Conductor says this is montisory UP Diliman Doctors' },
};

/** The longest note, 200 characters, and a long place name that wraps. */
export const LongContent: Story = {
  args: {
    note: 'Sa may kanto, tapat ng botika. '.repeat(7).slice(0, 200),
    place: 'Near Quezon Memorial Circle Jeepney Terminal, Elliptical Road',
  },
};

/** No hotspot Para has near the stop. */
export const NoNearbyPlace: Story = { args: { place: 'No nearby place' } };

/** Cancel keeps nothing. */
export const Cancelled: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.type(canvas.getByRole('textbox'), 'Not this one');
    await userEvent.click(canvas.getByRole('button', { name: 'Cancel' }));
    await expect(args.onCancel).toHaveBeenCalledOnce();
    await expect(args.onSave).not.toHaveBeenCalled();
  },
};

/** As it first opens, while the published hotspots are still being read. */
export const FindingPlace: Story = { args: { place: 'Finding the place…' } };
