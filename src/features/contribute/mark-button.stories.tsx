import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';

import { MarkButton } from './mark-button';

const meta = {
  title: 'Features/Contribute/MarkButton',
  component: MarkButton,
  decorators: [
    (Story) => (
      <div className="grid min-h-40 min-w-56 place-items-center bg-neutral-200 p-6">
        <Story />
      </div>
    ),
  ],
  args: { canMark: true, onMark: fn() },
} satisfies Meta<typeof MarkButton>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Recording: a tap marks the place, and "Marked" shows beside the button for a moment. */
export const Default: Story = {};

/** The ride holds the most marks it can: the button stays, dimmed and disabled. */
export const AtTheLimit: Story = { args: { canMark: false } };
