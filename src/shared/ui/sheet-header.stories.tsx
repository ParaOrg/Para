import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { SheetHeader } from './sheet-header';

const meta = {
  title: 'Shared/UI/SheetHeader',
  component: SheetHeader,
  // As wide as a phone's sheet, on the sheet's own surface.
  decorators: [
    (Story) => (
      <div className="w-[390px] bg-surface py-3">
        <Story />
      </div>
    ),
  ],
  args: {
    onClose: fn(),
    // As a hotspot's card fills it, less its kind's pill: the place, cut to one line, and its box's name.
    children: (
      <>
        <p className="truncate text-base font-semibold text-content-primary">Tala</p>
        <p className="truncate text-xs text-content-secondary">Tala Jeepney Terminal</p>
      </>
    ),
  },
} satisfies Meta<typeof SheetHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

/** What was tapped, and ✕, which closes the card. */
export const Default: Story = {
  play: async ({ args, canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Close' }));
    await expect(args.onClose).toHaveBeenCalledOnce();
  },
};

/**
 * A place name too long for one line: `min-w-0` keeps ✕ where it is, and the
 * name is cut as a hotspot's card cuts it.
 */
export const LongContent: Story = {
  args: {
    children: (
      <p className="truncate text-base font-semibold text-content-primary">
        Fairview Teraccess Transport Terminal, Quirino Highway corner Regalado Avenue
      </p>
    ),
  },
};
