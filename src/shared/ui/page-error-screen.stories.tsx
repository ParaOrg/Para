import type { Meta, StoryObj } from '@storybook/react-vite';

import { PageErrorScreen } from './page-error-screen';

const meta = {
  title: 'Shared/UI/PageErrorScreen',
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

/** The public map and the studio: what happened and Try again. */
export const Default: Story = {
  args: { description: 'Check your signal, then tap Try again.' },
};

/** The contributor page: recording is paused and what was kept is safe. */
export const Recording: Story = {
  args: {
    description:
      'Recording is paused. What you’ve recorded so far is safe on this phone. Check your signal, then tap Try again to continue.',
  },
};
