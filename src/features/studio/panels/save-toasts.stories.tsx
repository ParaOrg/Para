import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, within } from 'storybook/test';

import { SaveToasts } from './save-toasts';

const meta = {
  title: 'Features/Studio/SaveToasts',
  component: SaveToasts,
  // Over the foot of the map, as the workshop shows it. The `phone` parameter
  // puts it at a handset's width, as account-pill.stories.tsx does.
  decorators: [
    (Story, ctx) => (
      <div
        className={
          ctx.parameters.phone
            ? 'relative h-40 w-[390px] bg-surface-quaternary'
            : 'relative h-40 w-[28rem] bg-surface-quaternary'
        }
      >
        <Story />
      </div>
    ),
  ],
  args: {
    toast: { text: '"Tala" is where Tala – SM Fairview ends. Delete that route first.' },
    onDismiss: fn(),
  },
} satisfies Meta<typeof SaveToasts>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A problem: announced as one. */
export const Notice: Story = {
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole('alert')).toBeVisible();
  },
};

/** A publish: what changes now and what at the next publish. */
export const Published: Story = {
  args: {
    toast: {
      text: 'Published. The Studio map shows it now; the public map changes at the next publish.',
    },
  },
};

/** A long notice wraps inside the toast. */
export const LongContent: Story = {
  args: {
    toast: {
      text: '"Novaliches Bayan" is where Novaliches Bayan – SM Fairview – Lagro via Quirino Highway ends, and where two more routes start. Delete those routes first.',
    },
  },
};

/**
 * On a phone the toast goes to the top, as wide as the screen, and wraps: the
 * `sm` breakpoint reads the viewport, not this box, hence the phone viewport
 * as well as the phone width.
 */
export const Phone: Story = {
  args: LongContent.args,
  parameters: { phone: true },
  globals: { viewport: { value: 'mobile1', isRotated: false } },
};

/** Nothing to say: nothing shown. */
export const Empty: Story = {
  args: { toast: null },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).queryByTestId('toast')).toBeNull();
  },
};
