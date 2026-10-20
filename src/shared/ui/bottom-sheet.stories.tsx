import type { Meta, StoryObj } from '@storybook/react-vite';
import type { ComponentProps } from 'react';
import { useState } from 'react';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';

import { BottomSheet } from './bottom-sheet';
import type { Snap } from './sheet-gesture';
import { SheetHeader } from './sheet-header';

/** Sample rows only: enough of them to need the sheet's whole height. */
const rows = (count: number) =>
  Array.from({ length: count }, (_, i) => ({ id: `row-${i + 1}`, label: `Hintuan ${i + 1}` }));

/** A body of plain rows, 16 in as every card's body sits. */
function Rows({ count }: { count: number }) {
  return (
    <ul className="divide-y divide-border-primary px-4 text-sm text-content-primary">
      {rows(count).map((row) => (
        <li key={row.id} className="py-3">
          {row.label}
        </li>
      ))}
    </ul>
  );
}

/**
 * Keeps the height as the public map does (`height`), starting where the
 * story says: a sheet left to keep its own always opens at Middle.
 */
function Keeping({ startsAt, ...props }: ComponentProps<typeof BottomSheet> & { startsAt: Snap }) {
  const [snap, setSnap] = useState<Snap>(startsAt);
  return (
    <BottomSheet
      {...props}
      height={{
        snap,
        onSnap: (next) => {
          props.height?.onSnap(next);
          setSnap(next);
        },
      }}
    />
  );
}

const header = (
  <SheetHeader onClose={fn()}>
    <h2 className="text-lg font-semibold text-content-primary">Tala Jeepney Terminal</h2>
    <p className="text-sm text-content-secondary">Tala</p>
  </SheetHeader>
);

const meta = {
  title: 'Shared/UI/BottomSheet',
  component: BottomSheet,
  // The sheet fills the map it sits on, so give it a map-sized box marked
  // `@container`, as the apps' roots are, and `data-dock-host`, as the page
  // is. The `phone` parameter shrinks the box to a handset, where it docks
  // along the bottom; otherwise it is 1024 wide, where it floats (`@float:`).
  decorators: [
    (Story, ctx) => (
      <div
        data-dock-host
        className={
          ctx.parameters.phone
            ? '@container relative h-[700px] w-[390px] overflow-clip bg-surface-quaternary'
            : '@container relative h-[40rem] w-[1024px] overflow-clip bg-surface-quaternary'
        }
      >
        <Story />
      </div>
    ),
  ],
  parameters: { layout: 'fullscreen', phone: true },
  args: {
    label: 'Tala Jeepney Terminal',
    testId: 'card',
    header,
    onClose: fn(),
    children: <Rows count={6} />,
  },
} satisfies Meta<typeof BottomSheet>;

export default meta;
type Story = StoryObj<typeof meta>;

/** On a phone it opens at Middle: the handle, the header, and the top of the body. */
export const Middle: Story = {};

/** Low: the header and the top of the first row; a tap on the handle raises it. */
export const Low: Story = {
  render: (args) => <Keeping {...args} startsAt="low" />,
  args: { height: { snap: 'low', onSnap: fn() } },
};

/** Max: the whole map but a strip of it, the body scrolling under the header. */
export const Max: Story = {
  render: (args) => <Keeping {...args} startsAt="max" />,
  args: { height: { snap: 'max', onSnap: fn() }, children: <Rows count={30} /> },
};

/** A free height between Middle and Max, set by a caller rather than a drag: its body still, and the handle says so. */
export const Free: Story = {
  render: (args) => <Keeping {...args} startsAt={0.75} />,
  args: { height: { snap: 0.75, onSnap: fn() } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByTestId('card')).toHaveAttribute('data-snap', 'free');
    await expect(canvas.getByTestId('dock-handle')).toHaveAccessibleName(
      'Sheet raised past half the screen. Raise to full screen',
    );
  },
};

/** The handle from the keyboard goes round: Middle → Max → Low → Middle, and says where it is. */
export const HandleGoesRound: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const sheet = canvas.getByTestId('card');
    const handle = canvas.getByTestId('dock-handle');
    await expect(handle).toHaveAccessibleName('Sheet at half the screen. Raise to full screen');
    handle.focus();
    await userEvent.keyboard('{Enter}');
    await expect(sheet).toHaveAttribute('data-snap', 'max');
    await userEvent.keyboard('{Enter}');
    await expect(sheet).toHaveAttribute('data-snap', 'low');
    await userEvent.keyboard('{Enter}');
    await expect(sheet).toHaveAttribute('data-snap', 'middle');
    handle.blur();
  },
};

/** It takes the focus as it opens, as a dialog does, and Escape does what ✕ does. */
export const EscapeCloses: Story = {
  play: async ({ args, canvasElement }) => {
    // Focused by its own effect, which also starts it listening for Escape.
    await waitFor(() => expect(within(canvasElement).getByTestId('card')).toHaveFocus());
    await userEvent.keyboard('{Escape}');
    await expect(args.onClose).toHaveBeenCalledOnce();
  },
};

/** Kept, but not shown: the list behind a trip it opened. Nothing is drawn, and Escape is not its. */
export const Hidden: Story = {
  args: { hidden: true },
  play: async ({ args, canvasElement }) => {
    await expect(within(canvasElement).getByTestId('card')).not.toBeVisible();
    await userEvent.keyboard('{Escape}');
    await expect(args.onClose).not.toHaveBeenCalled();
  },
};

/** A wide map: the route list's and a trip's panel, flush in the top-left corner, 384 wide. */
export const Corner: Story = { parameters: { phone: false } };

/** A wide map, `floats="card"`: the studio's card, 16 in, rounded, with its own shadow. */
export const Card: Story = { args: { floats: 'card' }, parameters: { phone: false } };

/** More rows than the corner panel is tall: its body scrolls under the header. */
export const CornerLongContent: Story = {
  args: { children: <Rows count={30} /> },
  parameters: { phone: false },
};

/** A place name too long for one line wraps beside ✕; it is never cut. */
export const LongHeader: Story = {
  args: {
    label: 'Fairview Teraccess Transport Terminal, Quirino Highway corner Regalado Avenue',
    header: (
      <SheetHeader onClose={fn()}>
        <h2 className="text-lg font-semibold text-content-primary">
          Fairview Teraccess Transport Terminal, Quirino Highway corner Regalado Avenue
        </h2>
      </SheetHeader>
    ),
  },
};
