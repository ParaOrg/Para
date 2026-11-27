import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, within } from 'storybook/test';

import { IconButton } from './icon-button';

/** The set's default icon, the same navigation arrow Button's stories use. */
const NavIcon = (
  <svg viewBox="0 0 20 20" fill="currentColor">
    <path d="M17.8 2.2a.75.75 0 0 1 .17.8l-5.6 14.4a.75.75 0 0 1-1.4-.03l-2.03-5.55-5.55-2.03a.75.75 0 0 1-.03-1.4L17 2.03a.75.75 0 0 1 .8.17Z" />
  </svg>
);

const meta = {
  title: 'DesignSystem/Primitives/IconButton',
  component: IconButton,
  args: { icon: NavIcon, label: 'Go', onClick: fn() },
} satisfies Meta<typeof IconButton>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Special, 40px: Button's jeepney pill with only the icon. Hover and press wear the Special shadows. */
export const Special: Story = {};

/** Brand, 48px: Button's Primary pill with only the icon, the studio's + over the map. */
export const Brand: Story = { args: { variant: 'brand', size: 'large', label: 'Add' } };

/** 48px, a 28px icon. */
export const Large: Story = { args: { size: 'large' } };

/**
 * Large with a count (the filter, 4885:42133): the Indicator on its top right corner, 4 out from
 * the pill, 20 across.
 */
export const LargeWithCount: Story = {
  args: { size: 'large', count: 4, label: 'Filter: 4 modes' },
  play: async ({ canvasElement }) => {
    const button = within(canvasElement).getByRole('button', { name: 'Filter: 4 modes' });
    const badge = within(canvasElement).getByText('4');
    const pill = button.getBoundingClientRect();
    const box = badge.getBoundingClientRect();
    await expect({
      pill: pill.width,
      badge: [box.width, box.height],
      out: [box.right - pill.right, pill.top - box.top],
    }).toEqual({ pill: 48, badge: [20, 20], out: [4, 4] });
  },
};

/** Disabled with a count: the badge dims with the pill, at opacity/60. */
export const LargeWithCountDisabled: Story = {
  args: { size: 'large', count: 4, label: 'Filter: 4 modes', disabled: true },
};

/** Two digits, the most the circle holds. */
export const LargeWithTwoDigitCount: Story = {
  args: { size: 'large', count: 12, label: 'Filter: 12' },
};

/** A count of none: no badge, the pill alone. */
export const LargeCountNone: Story = {
  args: { size: 'large', count: 0 },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).queryByText('0')).toBeNull();
  },
};

/** The count on Base: a small button with what it stands for counted. */
export const BaseWithCount: Story = { args: { count: 1 } };

/** 32px, a 20px icon. */
export const Small: Story = { args: { size: 'small' } };

/** Plain, 32px: the icon alone, no surface and no shadow (the route line detail's ⋮). */
export const Plain: Story = {
  args: { variant: 'plain', size: 'small', label: 'More' },
  play: async ({ canvasElement }) => {
    const button = within(canvasElement).getByRole('button', { name: 'More' });
    await expect(getComputedStyle(button).backgroundColor).toBe('rgba(0, 0, 0, 0)');
  },
};

/** Opacity/60 and truly disabled: hover and press leave the button as it is, but its tooltip still names it. */
export const Disabled: Story = {
  render: () => (
    <div className="flex items-center gap-3">
      <IconButton icon={NavIcon} label="Go" disabled />
      <IconButton icon={NavIcon} label="Go" size="small" disabled />
      <IconButton icon={NavIcon} label="Add" variant="brand" size="large" disabled />
    </div>
  ),
};

/** aria-disabled: looks as Disabled, but keeps focus, for a button that has just stopped working. */
export const AriaDisabled: Story = {
  render: () => (
    <div className="flex items-center gap-3">
      <IconButton icon={NavIcon} label="Go" aria-disabled />
      <IconButton icon={NavIcon} label="Add" variant="brand" size="large" aria-disabled />
    </div>
  ),
};

/**
 * Hover one: after delay/tooltip its label shows as the Tooltip, on the side
 * the screen asked for (the prop names the arrow's side, as the Tooltip set
 * does). Never on a phone.
 */
export const TooltipSides: Story = {
  render: () => (
    <div className="grid grid-cols-2 gap-x-40 gap-y-20 p-16">
      <IconButton icon={NavIcon} label="Where am I" tooltip="bottom" />
      <IconButton icon={NavIcon} label="Where am I" tooltip="top" />
      <IconButton icon={NavIcon} label="Where am I" tooltip="left" />
      <IconButton icon={NavIcon} label="Where am I" tooltip="right" />
    </div>
  ),
};

/**
 * A real specimen: round controls floating on the map at phone width, the
 * way "Where am I" and the studio's Brand + sit over it. At the screen's edge
 * the screen picks the side facing away from it — Right, so the bubble opens
 * to the left.
 */
export const MapSpecimen: Story = {
  render: () => (
    <div className="@container relative h-56 w-[390px] overflow-hidden bg-neutral-200">
      <div className="absolute right-3 bottom-3 flex flex-col items-end gap-2">
        <IconButton icon={NavIcon} label="Where am I" tooltip="right" />
        <IconButton icon={NavIcon} label="Where am I" size="small" tooltip="right" />
        <IconButton icon={NavIcon} label="Add" variant="brand" size="large" tooltip="right" />
      </div>
    </div>
  ),
};
