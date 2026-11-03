import type { Meta, StoryObj } from '@storybook/react-vite';

import { ErrorBoundary } from './error-boundary';

const meta = {
  title: 'Shared/UI/ErrorBoundary',
  component: ErrorBoundary,
  args: {
    fallback: <p className="p-4 text-base/6 text-content-primary">The page’s fallback.</p>,
    children: <p className="p-4 text-base/6 text-content-primary">The page, shown as usual.</p>,
  },
} satisfies Meta<typeof ErrorBoundary>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Nothing under it throws: the page shows. */
export const Default: Story = {};

/** Something under it throws as it renders: the fallback stands in for the page. */
export const Failed: Story = { args: { children: <Throws /> } };

/** A part of the page that fails as it renders, as a screen whose code could not be fetched does. */
function Throws(): never {
  throw new Error('This part of the page could not be shown.');
}
