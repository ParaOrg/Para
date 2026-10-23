import type { Meta, StoryObj } from '@storybook/react-vite';

import { ButtonLink } from './button-link';

/** A stand-in square arrow; the app's own is ArrowRightIcon (shared/ui), out of the design system's reach. */
const ArrowIcon = (
  <svg viewBox="0 0 16 16" fill="currentColor">
    <path d="M3.3 7.4h9a.6.6 0 0 1 0 1.2h-9a.6.6 0 0 1 0-1.2Z" />
    <path d="M8.2 3.6a.6.6 0 0 1 .84-.1l.02.02c.3.22 1.2.9 2 1.63.5.45 1 .93 1.43 1.38.2.23.4.46.5.68.13.2.27.5.27.8s-.14.58-.26.78c-.14.22-.32.46-.52.68-.4.46-.92.94-1.43 1.38-.5.44-1.02.85-1.4 1.15l-.5.4-.12.08a.6.6 0 0 1-.72-.96c.02-.02.4-.3.67-.5.37-.28.86-.67 1.35-1.1.5-.42.97-.87 1.32-1.27.17-.2.3-.37.39-.5.05-.1.07-.15.08-.17-.01-.02-.03-.08-.08-.17a4 4 0 0 0-.39-.5c-.35-.4-.82-.85-1.32-1.27a22 22 0 0 0-1.35-1.1l-.54-.4a.6.6 0 0 1-.1-.84Z" />
  </svg>
);

const PlusIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M12 5v14M5 12h14" />
  </svg>
);

const meta = {
  title: 'DesignSystem/Primitives/ButtonLink',
  component: ButtonLink,
  args: { label: 'Contribute', href: '#', variant: 'special', firstIcon: PlusIcon },
} satisfies Meta<typeof ButtonLink>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Button's Special pill as a link, its icon before the word (the map's Contribute). */
export const Special: Story = {};

export const SpecialWithoutIcon: Story = { args: { firstIcon: undefined } };

/** Secondary: Special's surface in Medium. */
export const Secondary: Story = { args: { variant: 'secondary' } };

/** Primary, brand blue. */
export const Primary: Story = {
  args: { variant: 'primary', firstIcon: undefined, lastIcon: ArrowIcon },
};

/** Primary Small in a card's fill, on the card it sits on (4147:11947). */
export const OnACard: Story = {
  args: {
    variant: 'primary',
    size: 'small',
    fill: 'card-orange',
    firstIcon: undefined,
    lastIcon: ArrowIcon,
  },
  decorators: [
    (Story) => (
      <div className="bg-card-orange-surface p-4 text-content-inverse">
        <Story />
      </div>
    ),
  ],
};

/** On MRT-3's yellow the words are the card's dark ones. */
export const OnDarkWords: Story = {
  args: {
    variant: 'primary',
    size: 'small',
    fill: 'map-rail-metro-rail-way-three',
    firstIcon: undefined,
    lastIcon: ArrowIcon,
  },
  decorators: [
    (Story) => (
      <div className="bg-map-rail-metro-rail-way-three-surface p-4 text-content-primary">
        <Story />
      </div>
    ),
  ],
};

/** A longer word, at a phone's width. */
export const Phone: Story = {
  args: { label: 'Contribute a missing route' },
  decorators: [
    (Story) => (
      <div className="@container w-97.5">
        <Story />
      </div>
    ),
  ],
};
