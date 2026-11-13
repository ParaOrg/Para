import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { StopNotesScreen } from './stop-notes-screen';

const T0 = Date.UTC(2026, 10, 13, 1, 0);
const MARKS = [
  { time: T0, note: 'Conductor says this is montisory UP Diliman Doctors' },
  { time: T0 + 600_000, note: 'This location is for' },
  { time: T0 + 1_200_000 },
];
const PLACES = ['UP Diliman', 'Near Philcoa', 'No nearby place'];

const meta = {
  title: 'Features/Contribute/StopNotesScreen',
  component: StopNotesScreen,
  args: {
    marks: MARKS,
    places: PLACES,
    onBack: fn(),
    onNoteMark: fn(),
    onDeleteMark: fn(),
  },
  decorators: [
    (Story) => (
      <div className="relative h-[852px] w-[393px] overflow-hidden">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof StopNotesScreen>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Figma's Stops notes (4720:28437): a note, another, and a stop with none, Add note. */
export const Default: Story = {};

/** Edit opens the note in place, with Cancel and Save; Save keeps it on that stop. */
export const Editing: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getAllByRole('button', { name: 'Edit' })[1]);
    const field = canvas.getByRole('textbox', { name: 'Near Philcoa' });
    await expect(field).toHaveFocus();
    await userEvent.type(field, ' the school service');
    await userEvent.click(canvas.getByRole('button', { name: 'Save' }));
    await expect(args.onNoteMark).toHaveBeenCalledWith(
      T0 + 600_000,
      'This location is for the school service',
    );
    // The field gone, focus is back on the Edit that opened it.
    await expect(canvas.getAllByRole('button', { name: 'Edit' })[1]).toHaveFocus();
  },
};

/** Add note on a stop with none opens its field. */
export const AddNote: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Add note' }));
    await expect(canvas.getByRole('textbox', { name: 'No nearby place' })).toHaveFocus();
  },
};

/** Delete asks first; Delete takes the whole stop off the ride. */
export const DeleteAsks: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getAllByRole('button', { name: 'Delete this stop' })[0]);
    const question = canvas.getByRole('alertdialog', { name: 'Delete this stop?' });
    await expect(within(question).getByRole('button', { name: 'Keep' })).toHaveFocus();
    await userEvent.click(within(question).getByRole('button', { name: 'Delete' }));
    await expect(args.onDeleteMark).toHaveBeenCalledWith(T0);
  },
};

/** From History: read only, no Edit, Delete or Add note. */
export const ReadOnly: Story = {
  args: { onNoteMark: undefined, onDeleteMark: undefined },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.queryByRole('button', { name: 'Edit' })).toBeNull();
    await expect(canvas.getByText('No note')).toBeVisible();
  },
};

/** One stop alone: its dot, no rail. */
export const OneStop: Story = { args: { marks: MARKS.slice(0, 1), places: PLACES.slice(0, 1) } };

/** The places still being read: each stop says so. */
export const FindingPlaces: Story = { args: { places: MARKS.map(() => 'Finding the place…') } };

/** Every stop deleted while the page is open: the count at 0 and no stops. Figma draws no frame. */
export const AllDeleted: Story = { args: { marks: [], places: [] } };
