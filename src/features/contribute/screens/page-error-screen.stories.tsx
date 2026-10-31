import type { Meta, StoryObj } from '@storybook/react-vite';

import { PageErrorScreen } from './page-error-screen';

const meta = {
  title: 'Features/Contribute/PageErrorScreen',
  component: PageErrorScreen,
  // A phone: the screen stands in for the whole page.
  decorators: [
    (Story) => (
      <div className="h-[852px] w-[393px] overflow-hidden">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof PageErrorScreen>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A screen of the page failed: what happened, that recording is paused and what was kept, and Try again. */
export const Default: Story = {};
