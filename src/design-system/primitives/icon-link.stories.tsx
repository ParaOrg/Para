import type { Meta, StoryObj } from '@storybook/react-vite';

import { IconLink } from './icon-link';

const PlusIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M12 5v14M5 12h14" />
  </svg>
);

const meta = {
  title: 'DesignSystem/Primitives/IconLink',
  component: IconLink,
  args: { icon: PlusIcon, label: 'Contribute a route', href: '#' },
} satisfies Meta<typeof IconLink>;

export default meta;
type Story = StoryObj<typeof meta>;

/** IconButton's Special pill as a link: 40px, the tooltip on hover (never on a phone). */
export const Special: Story = {};

/** 32px, a 20px icon. */
export const Small: Story = { args: { size: 'small' } };
