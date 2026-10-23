import type { Meta, StoryObj } from '@storybook/react-vite';

import { ButtonLink } from './button-link';

/** A stand-in square arrow; the app's own is ArrowRightIcon (shared/ui), out of the design system's reach. */
const ArrowIcon = (
  <svg viewBox="0 0 16 16" fill="currentColor">
    <path d="M3.3 7.4h9a.6.6 0 0 1 0 1.2h-9a.6.6 0 0 1 0-1.2Z" />
    <path d="M8.2 3.6a.6.6 0 0 1 .84-.1l.02.02c.3.22 1.2.9 2 1.63.5.45 1 .93 1.43 1.38.2.23.4.46.5.68.13.2.27.5.27.8s-.14.58-.26.78c-.14.22-.32.46-.52.68-.4.46-.92.94-1.43 1.38-.5.44-1.02.85-1.4 1.15l-.5.4-.12.08a.6.6 0 0 1-.72-.96c.02-.02.4-.3.67-.5.37-.28.86-.67 1.35-1.1.5-.42.97-.87 1.32-1.27.17-.2.3-.37.39-.5.05-.1.07-.15.08-.17-.01-.02-.03-.08-.08-.17a4 4 0 0 0-.39-.5c-.35-.4-.82-.85-1.32-1.27a22 22 0 0 0-1.35-1.1l-.54-.4a.6.6 0 0 1-.1-.84Z" />
  </svg>
);

const meta = {
  title: 'DesignSystem/Primitives/ButtonLink',
  component: ButtonLink,
  args: { label: 'Contribute', href: '#', fill: 'card-orange', lastIcon: ArrowIcon },
  decorators: [
    (Story) => (
      <div className="bg-card-orange-surface p-4 text-content-inverse">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ButtonLink>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Button's Primary Small as a link, on the card it sits on. */
export const Default: Story = {};

/** On MRT-3's yellow the words are the card's dark ones. */
export const OnDarkWords: Story = {
  args: { fill: 'map-rail-metro-rail-way-three' },
  decorators: [
    (Story) => (
      <div className="bg-map-rail-metro-rail-way-three-surface p-4 text-content-primary">
        <Story />
      </div>
    ),
  ],
};

export const WithoutIcon: Story = { args: { lastIcon: undefined } };
