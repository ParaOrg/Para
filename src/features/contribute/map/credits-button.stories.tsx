import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';

import { CreditsButton } from './credits-button';

const meta = {
  title: 'Features/Contribute/CreditsButton',
  component: CreditsButton,
  // Over a map-coloured box, as it stands at the map's bottom left.
  decorators: [
    (Story) => (
      <div className="grid min-h-24 min-w-24 place-items-center bg-surface-secondary">
        <Story />
      </div>
    ),
  ],
  args: { onClick: fn() },
} satisfies Meta<typeof CreditsButton>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Figma's Information, 32 across at 40%: it opens the Map Data Source sheet. */
export const Default: Story = {};
