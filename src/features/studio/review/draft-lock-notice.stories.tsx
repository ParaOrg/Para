import type { Meta, StoryObj } from '@storybook/react-vite';

import { DraftLockNotice } from './draft-lock-notice';

const meta = {
  title: 'Features/Studio/DraftLockNotice',
  component: DraftLockNotice,
  args: { lock: { state: 'other', name: 'Marisol' }, onRetry: () => undefined },
} satisfies Meta<typeof DraftLockNotice>;
export default meta;
type Story = StoryObj<typeof meta>;

export const ChangedByName: Story = {};
export const NoNameOnFile: Story = { args: { lock: { state: 'other', name: null } } };
export const Checking: Story = { args: { lock: { state: 'checking' } } };
export const CouldNotCheck: Story = { args: { lock: { state: 'unknown' } } };
