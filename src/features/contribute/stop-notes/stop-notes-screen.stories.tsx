import type { Meta, StoryObj } from '@storybook/react-vite';
import { useEffect, useState, type ComponentProps } from 'react';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';

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
    points: [null, null, null],
    trail: null,
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

/** A tap on a note opens it in place, with Cancel and Save; Save keeps it on that stop. */
export const Editing: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const box = canvas.getByRole('button', { name: 'Change the note: This location is for' });
    await userEvent.click(box);
    const field = canvas.getByRole('textbox', { name: 'Near Philcoa' });
    await expect(field).toHaveFocus();
    await userEvent.type(field, ' the school service');
    await userEvent.click(canvas.getByRole('button', { name: 'Save' }));
    await expect(args.onNoteMark).toHaveBeenCalledWith(
      T0 + 600_000,
      'This location is for the school service',
    );
    // The field gone, focus is back on the note's box.
    await expect(
      canvas.getByRole('button', { name: 'Change the note: This location is for' }),
    ).toHaveFocus();
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

/** "Stop 1 ›" opens the stop on its map (4725:29011); its Delete asks first, then the stop goes. */
export const MapAndDelete: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Stop 1 on the map' }));
    const popup = canvas.getByRole('dialog', { name: 'Stop 1 on the map' });
    await userEvent.click(within(popup).getByRole('button', { name: 'Delete' }));
    const question = canvas.getByRole('alertdialog', { name: 'Delete this stop?' });
    await expect(within(question).getByRole('button', { name: 'Keep' })).toHaveFocus();
    await userEvent.click(within(question).getByRole('button', { name: 'Delete' }));
    await expect(args.onDeleteMark).toHaveBeenCalledWith(T0);
  },
};

/** Delete answered Keep: the stop stays, and focus is back in its map's card. */
export const MapDeleteKept: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Stop 1 on the map' }));
    const popup = canvas.getByRole('dialog', { name: 'Stop 1 on the map' });
    await userEvent.click(within(popup).getByRole('button', { name: 'Delete' }));
    const question = canvas.getByRole('alertdialog', { name: 'Delete this stop?' });
    await userEvent.click(within(question).getByRole('button', { name: 'Keep' }));
    await expect(args.onDeleteMark).not.toHaveBeenCalled();
    await waitFor(() => expect(popup.contains(document.activeElement)).toBe(true));
  },
};

/** Close shuts the stop's map and gives focus back to the "Stop N ›" that opened it. */
export const MapClosed: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const opener = canvas.getByRole('button', { name: 'Stop 2 on the map' });
    await userEvent.click(opener);
    const popup = canvas.getByRole('dialog', { name: 'Stop 2 on the map' });
    await userEvent.click(within(popup).getByRole('button', { name: 'Close' }));
    await expect(canvas.queryByRole('dialog')).toBeNull();
    await expect(opener).toHaveFocus();
  },
};

/** The page re-drawn while a stop's map is open, as each GPS fix does during a ride. */
function RedrawnStopNotes(props: ComponentProps<typeof StopNotesScreen>) {
  const [, setFixes] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setFixes((fixes) => fixes + 1), 50);
    return () => clearInterval(timer);
  }, []);
  return <StopNotesScreen {...props} />;
}

/** Escape on a stop's map closes the map alone, even after the page has re-drawn under it. */
export const MapEscapeAfterRedraws: Story = {
  render: (args) => <RedrawnStopNotes {...args} />,
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Stop 1 on the map' }));
    await canvas.findByRole('dialog', { name: 'Stop 1 on the map' });
    // A few re-draws with the map open.
    await new Promise((resolve) => setTimeout(resolve, 300));
    await userEvent.keyboard('{Escape}');
    await expect(canvas.queryByRole('dialog')).toBeNull();
    await expect(args.onBack).not.toHaveBeenCalled();
  },
};

/** Tab stays inside a stop's map: it never reaches the page's Back behind it. */
export const MapTrapsTab: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Stop 1 on the map' }));
    const popup = canvas.getByRole('dialog', { name: 'Stop 1 on the map' });
    for (const shift of [false, false, false, true, true, true]) {
      await userEvent.tab({ shift });
      await expect(popup.contains(document.activeElement)).toBe(true);
    }
  },
};

const TEN = Array.from({ length: 10 }, (_, at) => ({ time: T0 + at * 600_000 }));

/** Ten stops scrolled: a stop's map still dims the whole page, not just its top. */
export const ScrolledMap: Story = {
  args: {
    marks: TEN,
    places: TEN.map((_, at) => `Place ${at + 1}`),
    points: TEN.map(() => null),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const frame = canvasElement.querySelector('div');
    // The page's scrolling column, whichever element it is.
    const scroller = [...canvasElement.querySelectorAll<HTMLElement>('*')].find(
      (element) =>
        element.scrollHeight > element.clientHeight + 1 &&
        getComputedStyle(element).overflowY === 'auto',
    );
    await expect(scroller).toBeDefined();
    if (!frame || !scroller) return;
    await userEvent.click(canvas.getByRole('button', { name: 'Stop 1 on the map' }));
    const dim = canvas.getByRole('dialog', { name: 'Stop 1 on the map' }).parentElement;
    // The stops scrolled 188 px with the map open over them.
    scroller.scrollTop = 188;
    await expect(scroller.scrollTop).toBeGreaterThan(0);
    const want = frame.getBoundingClientRect();
    const got = dim?.getBoundingClientRect();
    await expect(Math.round(got?.top ?? -1)).toBe(Math.round(want.top));
    await expect(Math.round(got?.bottom ?? -1)).toBe(Math.round(want.bottom));
  },
};

/** From History: read only, the notes not buttons, and the map's pop-up with Close alone. */
export const ReadOnly: Story = {
  args: { onNoteMark: undefined, onDeleteMark: undefined },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.queryByRole('button', { name: /Change the note/ })).toBeNull();
    await expect(canvas.getByText('No note')).toBeVisible();
    await userEvent.click(canvas.getByRole('button', { name: 'Stop 3 on the map' }));
    const popup = canvas.getByRole('dialog', { name: 'Stop 3 on the map' });
    await expect(within(popup).queryByRole('button', { name: 'Delete' })).toBeNull();
  },
};

/** One stop alone: its dot, no rail. */
export const OneStop: Story = {
  args: { marks: MARKS.slice(0, 1), places: PLACES.slice(0, 1), points: [null] },
};

/** The places still being read: each stop says so. */
export const FindingPlaces: Story = { args: { places: MARKS.map(() => 'Finding the place…') } };

/** Every stop deleted while the page is open: it says so, with Go back. */
export const AllDeleted: Story = {
  args: { marks: [], places: [], points: [] },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('All stops are deleted')).toBeVisible();
    await userEvent.click(canvas.getByRole('button', { name: 'Go back' }));
    await expect(args.onBack).toHaveBeenCalledOnce();
  },
};
