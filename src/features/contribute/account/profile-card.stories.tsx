import type { Meta, StoryObj } from '@storybook/react-vite';

import { ProfileCard } from './profile-card';

const meta = {
  title: 'Features/Contribute/ProfileCard',
  component: ProfileCard,
  args: { name: 'Rovic', email: 'rovic@example.com' },
  decorators: [
    (Story) => (
      <div className="w-[393px] bg-surface px-5 py-8">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ProfileCard>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The account icon in its circle, the name and the email (4506:19835). */
export const Default: Story = {};

/** The name still loading. */
export const Loading: Story = { args: { name: null } };

export const LongName: Story = {
  args: {
    name: 'Juan Protacio Emmanuel dela Cruz y Santos de la Rosa del Rosario',
    email: 'juan.dela.cruz.the.third.of.quezon.city@example-long-domain.com',
  },
};
