import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';

import { FoldButton } from './fold-button';

const meta = {
  title: 'Features/Contribute/FoldButton',
  component: FoldButton,
  // A box for its foot: on the page it stands 16 over the stack, at the left.
  decorators: [
    (Story) => (
      <div className="relative h-40 w-56 bg-neutral-200">
        <Story />
      </div>
    ),
  ],
  args: { isFolded: false, controls: 'recording-card', onFoldedChange: fn() },
} satisfies Meta<typeof FoldButton>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The card out: the chevron points down, to fold it away (Figma 4496:10784). */
export const Open: Story = {};

/** The card folded: the chevron turned up brings it back (4496:10906). */
export const Folded: Story = { args: { isFolded: true } };
