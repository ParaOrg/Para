import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';

import { EarlierRecordingsPanel } from './earlier-recordings-panel';

const meta = {
  title: 'Features/Contribute/EarlierRecordingsPanel',
  component: EarlierRecordingsPanel,
  args: { count: 3, onSend: fn(), onKeep: fn() },
  decorators: [
    (Story) => (
      <div className="flex h-[480px] w-[390px] flex-col justify-end overflow-hidden bg-surface-secondary">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof EarlierRecordingsPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Several: Story = {};

/** One recording: the words say "it", not "them". */
export const One: Story = { args: { count: 1 } };
