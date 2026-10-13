import type { Meta, StoryObj } from '@storybook/react-vite';

import { SwitchIcon } from './switch-icon';

const meta = {
  title: 'Features/Routes/SwitchIcon',
  component: SwitchIcon,
  // It takes the colour of the words around it (currentColor), 16 across.
  decorators: [
    (Story) => (
      <div className="inline-flex bg-surface p-4 text-content-primary">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof SwitchIcon>;

export default meta;
type Story = StoryObj<typeof meta>;

/** As the studio's route card and a hotspot's card draw it, in Content/primary. */
export const Default: Story = {};

/** In Content/secondary, as a quieter control would wear it: it has no colour of its own. */
export const Secondary: Story = {
  decorators: [
    (Story) => (
      <div className="text-content-secondary">
        <Story />
      </div>
    ),
  ],
};
