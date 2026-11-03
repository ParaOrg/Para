import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';

import { LocationIcon } from './location-icon';

const meta = {
  title: 'DesignSystem/Primitives/LocationIcon',
  component: LocationIcon,
  // 24 px, as a toast draws it, in the colour around it.
  decorators: [
    (Story) => (
      <div className="flex gap-4 p-4">
        <span className="flex size-6 text-content-primary *:size-full">
          <Story />
        </span>
        <span className="flex size-6 text-content-error *:size-full">
          <Story />
        </span>
      </div>
    ),
  ],
} satisfies Meta<typeof LocationIcon>;

export default meta;
type Story = StoryObj<typeof meta>;

/** In Content/primary, and in a problem's colour: it takes the colour it is given. */
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const icons = canvasElement.querySelectorAll('svg[aria-hidden="true"]');
    await expect(icons).toHaveLength(2);
  },
};
