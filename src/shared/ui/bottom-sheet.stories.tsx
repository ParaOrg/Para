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

/**
 * Fitted (`fits`, Figma 4560:12422): two heights, Low and its content's. The handle opens it only
 * as tall as its three rows, the map in sight above, and lowers it again.
 */
export const FitsContent: Story = {
  render: (args) => <Keeping {...args} startsAt="low" />,
  args: { fits: true, height: { snap: 'low', onSnap: fn() }, children: <Rows count={3} /> },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const handle = canvas.getByTestId('dock-handle');
    await expect(handle).toHaveAccessibleName('Sheet lowered. Raise it');
    await userEvent.click(handle);
    await expect(handle).toHaveAccessibleName('Sheet raised. Lower it');
    await expect(canvas.getByTestId('card')).toHaveAttribute('data-snap', 'free');
    await userEvent.click(handle);
    await expect(canvas.getByTestId('card')).toHaveAttribute('data-snap', 'low');
  },
};

/** Fitted, with more than the map holds: it opens to Max, and its body scrolls there. */
export const FitsTallContent: Story = {
  render: (args) => <Keeping {...args} startsAt="low" />,
  args: { fits: true, height: { snap: 'low', onSnap: fn() }, children: <Rows count={30} /> },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByTestId('dock-handle'));
    await expect(canvas.getByTestId('card')).toHaveAttribute('data-snap', 'max');
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

/** A finger's pull down on the handle, `px` long, as the sheet's own listeners hear it. */
function pullDown(handle: HTMLElement, px: number) {
  const { left, top, width } = handle.getBoundingClientRect();
  const x = left + width / 2;
  const at = (y: number) => ({ pointerId: 7, button: 0, clientX: x, clientY: y, bubbles: true });
  handle.dispatchEvent(new PointerEvent('pointerdown', at(top + 4)));
  for (let moved = 20; moved <= px; moved += 20) {
    window.dispatchEvent(new PointerEvent('pointermove', at(top + 4 + moved)));
  }
  window.dispatchEvent(new PointerEvent('pointerup', at(top + 4 + px)));
}

/** Pulled down from Low, a card closes: the public map's and the studio's way. */
export const PullCloses: Story = {
  render: (args) => <Keeping {...args} startsAt="low" />,
  args: { height: { snap: 'low', onSnap: fn() } },
  play: async ({ args, canvasElement }) => {
    pullDown(within(canvasElement).getByTestId('dock-handle'), 200);
    await waitFor(() => expect(args.onClose).toHaveBeenCalledOnce());
  },
};

/** With `closesOnPull` off (a contributor's ride), the same pull leaves it at Low, open. */
export const PullRestsAtLow: Story = {
  render: (args) => <Keeping {...args} startsAt="low" />,
  args: { closesOnPull: false, height: { snap: 'low', onSnap: fn() } },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    pullDown(canvas.getByTestId('dock-handle'), 200);
    await waitFor(() => expect(canvas.getByTestId('card')).toHaveAttribute('data-snap', 'low'));
    await expect(args.onClose).not.toHaveBeenCalled();
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

/** A footer for the stories: a row of two buttons at the sheet's foot, the rest of it see-through. */
const footer = (
  <div className="flex w-full justify-between px-6 pb-8 sheet-floating:w-22 sheet-floating:flex-col sheet-floating:items-center sheet-floating:gap-2 sheet-floating:px-5 sheet-floating:pt-5">
    <button
      type="button"
      className="rounded-full bg-surface-tertiary px-4 py-2 text-content-primary"
    >
      Close
    </button>
    <button
      type="button"
      className="rounded-full bg-surface-tertiary px-4 py-2 text-content-primary"
    >
      Filter
    </button>
  </div>
);

/** A sheet with a shape of its own (`shape`), as the route list's: Low 240, a Max that fills the screen. */
const LIST_SHAPE = { lowPx: 240, isMaxFull: true };

/** `shape` at Low: 240 tall, its own Low rather than every card's 133. */
export const ShapeLow: Story = {
  render: (args) => <Keeping {...args} startsAt="low" />,
  args: { shape: LIST_SHAPE, height: { snap: 'low', onSnap: fn() } },
  play: async ({ canvasElement }) => {
    const sheet = within(canvasElement).getByTestId('card');
    await waitFor(() => expect(sheet).toHaveAttribute('data-low-px', '240'));
    await waitFor(() =>
      expect(
        Math.round(
          canvasElement.getBoundingClientRect().bottom - sheet.getBoundingClientRect().top,
        ),
      ).toBe(240),
    );
  },
};

/** `shape` at Max: the whole screen, no strip of map above it. */
export const ShapeMaxFills: Story = {
  render: (args) => <Keeping {...args} startsAt="max" />,
  args: { shape: LIST_SHAPE, height: { snap: 'max', onSnap: fn() }, children: <Rows count={30} /> },
  play: async ({ canvasElement }) => {
    const host = canvasElement.querySelector('[data-dock-host]') ?? canvasElement;
    const sheet = within(canvasElement).getByTestId('card');
    await waitFor(() =>
      expect(Math.round(sheet.getBoundingClientRect().top - host.getBoundingClientRect().top)).toBe(
        0,
      ),
    );
  },
};

/** `handle="hidden"`: no notch drawn, but the button is still there for Tab and a screen reader. */
export const HandleHidden: Story = {
  args: { handle: 'hidden', header: null },
  play: async ({ canvasElement }) => {
    const handle = within(canvasElement).getByTestId('dock-handle');
    await expect(handle).toHaveAccessibleName('Sheet at half the screen. Raise to full screen');
    await expect(handle.getBoundingClientRect().height).toBeLessThanOrEqual(1);
    handle.focus();
    await userEvent.keyboard('{Enter}');
    await expect(within(canvasElement).getByTestId('card')).toHaveAttribute('data-snap', 'max');
  },
};

/** `footer`: drawn at the sheet's foot on the screen, the rows scrolling under it. */
export const Footer: Story = {
  args: { footer, header: null },
  play: async ({ canvasElement }) => {
    const host = canvasElement.querySelector('[data-dock-host]') ?? canvasElement;
    const foot = within(canvasElement).getByTestId('sheet-footer');
    await waitFor(() =>
      expect(
        Math.round(host.getBoundingClientRect().bottom - foot.getBoundingClientRect().bottom),
      ).toBe(0),
    );
  },
};

/** `footer` at Low: still at the screen's foot, over what Low shows. */
export const FooterAtLow: Story = {
  render: (args) => <Keeping {...args} startsAt="low" />,
  args: { footer, header: null, shape: LIST_SHAPE, height: { snap: 'low', onSnap: fn() } },
};

/** `floats="dock"` on a wide screen: the map's whole height on the left, 368 wide, the footer beside it. */
export const Dock: Story = {
  args: { floats: 'dock', footer, header: null, handle: 'hidden', children: <Rows count={30} /> },
  parameters: { phone: false },
  play: async ({ canvasElement }) => {
    const host = canvasElement.querySelector('[data-dock-host]') ?? canvasElement;
    const sheet = within(canvasElement).getByTestId('card').getBoundingClientRect();
    const foot = within(canvasElement).getByTestId('sheet-footer').getBoundingClientRect();
    await expect(Math.round(sheet.width)).toBe(368);
    await expect(Math.round(sheet.height)).toBe(Math.round(host.getBoundingClientRect().height));
    await expect(Math.round(foot.left)).toBe(Math.round(sheet.right));
  },
};
