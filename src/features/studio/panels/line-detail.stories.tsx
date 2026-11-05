import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';

import { LineDetail } from './line-detail';

const meta = {
  title: 'Features/Studio/LineDetail',
  component: LineDetail,
  // At the sidebar's width, 348 inside its 16 each side.
  decorators: [
    (Story) => (
      <div className="w-95 bg-surface p-4 font-sn-pro">
        <Story />
      </div>
    ),
  ],
  parameters: { layout: 'padded' },
  args: { points: 3, metres: 13_700, status: 'draft', author: 'Roveec' },
} satisfies Meta<typeof LineDetail>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A draft, as Figma 4300:20893 draws it: Draft in orange, never published. */
export const Draft: Story = {
  play: async ({ canvasElement }) => {
    const detail = within(canvasElement).getByTestId('line-detail');
    await expect(detail).toHaveTextContent('Points3');
    await expect(detail).toHaveTextContent('Distance13.7 km');
    await expect(detail).toHaveTextContent('StatusDraft');
    await expect(detail).toHaveTextContent('Date published--');
  },
};

/** Published, as Figma 4614:15082 draws it: Published in green. */
export const Published: Story = {
  args: { status: 'published' },
};

/** Nothing known yet of who saved it and when: each reads "--". */
export const NotKnownYet: Story = {
  args: { author: null },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByTestId('line-detail')).toHaveTextContent('Author--');
  },
};

/** Every fact known, the author's name long: it wraps beside its label. */
export const AllKnown: Story = {
  args: {
    status: 'published',
    author: 'Maria Clara de los Santos Villanueva',
    datePublished: '5 Nov 2026',
    lastEdited: '5 Nov 2026, 9:42 am',
  },
};
