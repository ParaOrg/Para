import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';

import { HelpButton } from './help-button';

const meta = {
  title: 'Features/Contribute/HelpButton',
  component: HelpButton,
  args: { onClick: fn() },
  decorators: [
    (Story) => (
      <div className="bg-surface-quaternary p-4">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof HelpButton>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The ? (4486:25007). Not on the Start screen until the tutorial it opens is designed. */
export const Default: Story = {};
