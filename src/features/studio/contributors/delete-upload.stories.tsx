import type { Meta, StoryObj } from '@storybook/react-vite';
import { QueryClientProvider } from '@tanstack/react-query';
import { expect, fn, userEvent, within } from 'storybook/test';

import { createQueryClient } from '@/shared/lib/query-client';

import { DeleteUpload } from './delete-upload';

const meta = {
  title: 'Features/Studio/DeleteUpload',
  component: DeleteUpload,
  args: { contributionId: '11111111-0000-4000-8000-000000000001', onDeleted: fn() },
  decorators: [
    (Story) => (
      <QueryClientProvider client={createQueryClient()}>
        <div className="w-96 bg-surface p-4 font-sn-pro text-sm text-content-secondary">
          <Story />
        </div>
      </QueryClientProvider>
    ),
  ],
} satisfies Meta<typeof DeleteUpload>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Closed: Story = {};

/** The question, focused on Keep it. Deleting needs the studio's client, which a story has not. */
export const Asking: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Delete upload' }));
    await expect(canvas.getByRole('button', { name: 'Keep it' })).toHaveFocus();
  },
};
