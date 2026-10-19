import type { Meta, StoryObj } from '@storybook/react-vite';
import { QueryClientProvider } from '@tanstack/react-query';
import { expect, fn, userEvent, within } from 'storybook/test';

import { createQueryClient } from '@/shared/lib/query-client';

import { HideUpload } from './hide-upload';

const meta = {
  title: 'Features/Studio/HideUpload',
  component: HideUpload,
  args: {
    contributionId: '11111111-0000-4000-8000-000000000001',
    hiddenAt: null,
    hiddenNote: '',
    onChanged: fn(),
  },
  decorators: [
    (Story) => (
      <QueryClientProvider client={createQueryClient()}>
        <div className="w-96 bg-surface p-4 font-sn-pro text-sm text-content-secondary">
          <Story />
        </div>
      </QueryClientProvider>
    ),
  ],
} satisfies Meta<typeof HideUpload>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Visible: Story = {};

/** Asking why, the note optional and focused. Hiding needs the studio's client, which a story has not. */
export const Asking: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Hide' }));
    await expect(canvas.getByLabelText('Why hide it? (optional)')).toHaveFocus();
  },
};

export const Hidden: Story = {
  args: { hiddenAt: Date.UTC(2026, 9, 19, 4, 0, 0), hiddenNote: 'Walked, not a ride' },
};
