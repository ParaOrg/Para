import type { Meta, StoryObj } from '@storybook/react-vite';

import { SpecialButtonLink } from './special-button-link';

const PlusIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M12 5v14M5 12h14" />
  </svg>
);

const meta = {
  title: 'DesignSystem/Primitives/SpecialButtonLink',
  component: SpecialButtonLink,
  args: { label: 'Contribute', href: '#', firstIcon: PlusIcon },
} satisfies Meta<typeof SpecialButtonLink>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Button's Special pill as a link, its icon before the word. */
export const Default: Story = {};

export const WithoutIcon: Story = { args: { firstIcon: undefined } };

/** A longer word keeps its pill on one line. */
export const LongLabel: Story = { args: { label: 'Contribute a missing route' } };
