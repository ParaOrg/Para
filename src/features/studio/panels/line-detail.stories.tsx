import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';

import { LineDetail } from './line-detail';

const meta = {
  title: 'Features/Studio/LineDetail',
  component: LineDetail,
  // At the sidebar's width, 348 inside its 16 each side.
  // The `phone` parameter puts it at a handset's width, in the sheet over the map.
  decorators: [
    (Story, ctx) => (
      <div
        className={'bg-surface font-sn-pro ' + (ctx.parameters.phone ? 'w-97.5 p-6' : 'w-95 p-4')}
      >
        <Story />
      </div>
    ),
  ],
  parameters: { layout: 'padded' },
  args: { points: 3, metres: 13_700, status: 'draft' },
} satisfies Meta<typeof LineDetail>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * A draft, as Figma 4300:20893 draws it: Draft in orange, and no Last edited. Who saved it and
 * when read "--": not known yet, as for a line not saved or while they are read.
 */
export const Draft: Story = {
  play: async ({ canvasElement }) => {
    const detail = within(canvasElement).getByTestId('line-detail');
    await expect(detail).toHaveTextContent('Points3');
    await expect(detail).toHaveTextContent('Distance13.7 km');
    await expect(detail).toHaveTextContent('StatusDraft');
    await expect(detail).toHaveTextContent('Author--');
    await expect(detail).toHaveTextContent('Date published--');
    await expect(detail).not.toHaveTextContent('Last edited');
  },
};

/** Published, as Figma 4614:15082 draws it: Published in green, and Last edited. */
export const Published: Story = {
  args: { status: 'published' },
  play: async ({ canvasElement }) => {
    const detail = within(canvasElement).getByTestId('line-detail');
    await expect(detail).toHaveTextContent('StatusPublished');
    await expect(detail).toHaveTextContent('Last edited--');
  },
};

/**
 * Every fact known, as the edit stamps give them (use-line-stamps.ts), the author's name long: it
 * wraps beside its label.
 */
export const AllKnown: Story = {
  args: {
    status: 'published',
    author: 'Maria Clara de los Santos Villanueva',
    datePublished: '2 Nov 2026, 10:15 AM',
    lastEdited: '5 Nov 2026, 3:42 PM',
  },
  play: async ({ canvasElement }) => {
    const detail = within(canvasElement).getByTestId('line-detail');
    await expect(detail).toHaveTextContent('Date published2 Nov 2026, 10:15 AM');
    await expect(detail).toHaveTextContent('Last edited5 Nov 2026, 3:42 PM');
  },
};

/** A hotspot's outline: its corners, and no distance. */
export const Hotspot: Story = {
  args: { points: 4, pointsTerm: 'Corners', metres: null },
  play: async ({ canvasElement }) => {
    const detail = within(canvasElement).getByTestId('line-detail');
    await expect(detail).toHaveTextContent('Corners4');
    await expect(detail).not.toHaveTextContent('Distance');
  },
};

/** At a phone's width, in the sheet over the map. */
export const Phone: Story = {
  parameters: { phone: true },
  globals: { viewport: { value: 'mobile1', isRotated: false } },
};
