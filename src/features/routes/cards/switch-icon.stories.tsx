import type { Meta, StoryObj } from '@storybook/react-vite';

import { SwitchIcon } from './switch-icon';

const meta = {
  title: 'Features/Routes/SwitchIcon',
  component: SwitchIcon,
  // It takes the colour of the words around it (currentColor), 16 across:
  // Content/tertiary, in the 28 round button of a hotspot's card (hotspot-card.tsx).
  decorators: [
    (Story) => (
      <div className="inline-flex bg-surface p-4 text-content-tertiary">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof SwitchIcon>;

export default meta;
type Story = StoryObj<typeof meta>;

/** As a hotspot's card draws it, its ⇄ for the way back, in Content/tertiary. */
export const Default: Story = {};
