import type { Meta, StoryObj } from '@storybook/react-vite';
import type { ComponentProps } from 'react';
import { useState } from 'react';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';

import { cn } from '@/shared/utils/cn';

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
 * story says: a sheet left to keep its own always opens at Low.
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
  // `underSearch` sets `--sheet-float-top` as the public map does under its place search.
  decorators: [
    (Story, ctx) => (
      <div
        data-dock-host
        className={cn(
          ctx.parameters.phone
            ? '@container relative h-[700px] w-[390px] overflow-clip bg-surface-quaternary'
            : '@container relative h-[40rem] w-[1024px] overflow-clip bg-surface-quaternary',
          ctx.parameters.underSearch && '[--sheet-float-top:7.375rem]',
        )}
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

/** On a phone it opens at Low: the header and the top of the first row; a tap on the handle raises it a third. */
export const Low: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByTestId('card')).toHaveAttribute('data-snap', 'low');
    await expect(canvas.getByTestId('dock-handle')).toHaveAccessibleName(
      'Sheet lowered. Raise it a third',
    );
  },
};

/** Full height: the whole map but a strip of it, the body scrolling under the header. */
export const Full: Story = {
  render: (args) => <Keeping {...args} startsAt="full" />,
  args: { height: { snap: 'full', onSnap: fn() }, children: <Rows count={30} /> },
};

/**
 * Left between Low and full, where a drag let go: its body still, and the handle says how high it
 * is.
 */
export const Free: Story = {
  render: (args) => <Keeping {...args} startsAt={0.55} />,
  args: { height: { snap: 0.55, onSnap: fn() } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByTestId('card')).toHaveAttribute('data-snap', 'free');
    await expect(canvas.getByTestId('dock-handle')).toHaveAccessibleName(
      'Sheet at 55% of the map. Raise it a third',
    );
  },
};

/** Presses Enter on `handle` until `sheet` is at `end`, at most four times; how many it took. */
async function enterUntil(sheet: HTMLElement, end: 'low' | 'full'): Promise<number> {
  for (let presses = 1; presses <= 4; presses++) {
    await userEvent.keyboard('{Enter}');
    if (sheet.getAttribute('data-snap') === end) return presses;
  }
  return Infinity;
}

/**
 * Fitted (`fits`, Figma 4560:12422): its highest is its content's height, the map in sight above.
 * The handle raises it there, three rows needing less than a third, and lowers it again.
 */
export const FitsContent: Story = {
  render: (args) => <Keeping {...args} startsAt="low" />,
  args: { fits: true, height: { snap: 'low', onSnap: fn() }, children: <Rows count={3} /> },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const handle = canvas.getByTestId('dock-handle');
    await expect(handle).toHaveAccessibleName('Sheet lowered. Raise it a third');
    await userEvent.click(handle);
    await expect(canvas.getByTestId('card')).toHaveAttribute('data-snap', 'full');
    await expect(handle).toHaveAccessibleName('Sheet at full height. Lower it a third');
    await userEvent.click(handle);
    await expect(canvas.getByTestId('card')).toHaveAttribute('data-snap', 'low');
  },
};

/** Fitted, with more than the map holds: the handle raises it a third at a time to full height, where its body scrolls. */
export const FitsTallContent: Story = {
  render: (args) => <Keeping {...args} startsAt="low" />,
  args: { fits: true, height: { snap: 'low', onSnap: fn() }, children: <Rows count={30} /> },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const sheet = canvas.getByTestId('card');
    canvas.getByTestId('dock-handle').focus();
    await expect(await enterUntil(sheet, 'full')).toBeLessThanOrEqual(3);
  },
};

/**
 * The handle from the keyboard steps a third of the map: up from Low to full, then down to Low
 * again, and says each time how high the sheet is and which way it goes next.
 */
export const HandleStepsThirds: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const sheet = canvas.getByTestId('card');
    const handle = canvas.getByTestId('dock-handle');
    handle.focus();
    await userEvent.keyboard('{Enter}');
    await expect(sheet).toHaveAttribute('data-snap', 'free');
    await expect(handle.getAttribute('aria-label')).toMatch(
      /^Sheet at \d+% of the map\. Raise it a third$/,
    );
    await expect(await enterUntil(sheet, 'full')).toBeLessThanOrEqual(3);
    await expect(handle).toHaveAccessibleName('Sheet at full height. Lower it a third');
    await userEvent.keyboard('{Enter}');
    await expect(handle.getAttribute('aria-label')).toMatch(/Lower it a third$/);
    await expect(await enterUntil(sheet, 'low')).toBeLessThanOrEqual(3);
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

/** The sheet's top and bottom against its host, rounded to the pixel. */
const sheetEdges = (canvasElement: HTMLElement) => {
  const host = (
    canvasElement.querySelector('[data-dock-host]') ?? canvasElement
  ).getBoundingClientRect();
  const sheet = within(canvasElement).getByTestId('card').getBoundingClientRect();
  return {
    top: Math.round(sheet.top - host.top),
    bottomGap: Math.round(host.bottom - sheet.bottom),
  };
};

/**
 * The corner panel under the public map's place search (`--sheet-float-top`, 118 = 7.375rem):
 * it starts there, and a long body still ends inside the map.
 */
export const CornerUnderSearch: Story = {
  args: { children: <Rows count={30} /> },
  parameters: { phone: false, underSearch: true },
  play: async ({ canvasElement }) => {
    const { top, bottomGap } = sheetEdges(canvasElement);
    await expect(top).toBe(118);
    await expect(bottomGap).toBeGreaterThanOrEqual(0);
  },
};

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

/** A sheet with a shape of its own (`shape`), as the route list's: Low 240, a full height that fills the screen. */
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

/** `shape` at full height: the whole screen, no strip of map above it. */
export const ShapeFullFills: Story = {
  render: (args) => <Keeping {...args} startsAt="full" />,
  args: {
    shape: LIST_SHAPE,
    height: { snap: 'full', onSnap: fn() },
    children: <Rows count={30} />,
  },
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
    await expect(handle).toHaveAccessibleName('Sheet lowered. Raise it a third');
    await expect(handle.getBoundingClientRect().height).toBeLessThanOrEqual(1);
    handle.focus();
    await userEvent.keyboard('{Enter}');
    await expect(within(canvasElement).getByTestId('card')).toHaveAttribute('data-snap', 'free');
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

/** The docked list under the public map's place search: from 118 down to the map's bottom. */
export const DockUnderSearch: Story = {
  args: { floats: 'dock', footer, header: null, handle: 'hidden', children: <Rows count={30} /> },
  parameters: { phone: false, underSearch: true },
  play: async ({ canvasElement }) => {
    const { top, bottomGap } = sheetEdges(canvasElement);
    await expect(top).toBe(118);
    await expect(bottomGap).toBe(0);
  },
};

/** `floats="dock"` on a wide screen: the map's whole height on the left, 384 wide, the footer its top bar. */
export const Dock: Story = {
  args: { floats: 'dock', footer, header: null, handle: 'hidden', children: <Rows count={30} /> },
  parameters: { phone: false },
  play: async ({ canvasElement }) => {
    const host = canvasElement.querySelector('[data-dock-host]') ?? canvasElement;
    const sheet = within(canvasElement).getByTestId('card').getBoundingClientRect();
    const foot = within(canvasElement).getByTestId('sheet-footer').getBoundingClientRect();
    await expect(Math.round(sheet.width)).toBe(384);
    await expect(Math.round(sheet.height)).toBe(Math.round(host.getBoundingClientRect().height));
    await expect(Math.round(foot.top)).toBe(Math.round(sheet.top));
    await expect(Math.round(foot.width)).toBe(384);
  },
};
