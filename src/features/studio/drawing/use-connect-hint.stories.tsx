import type { Meta, StoryObj } from '@storybook/react-vite';
import { useEffect, useRef } from 'react';
import { expect, within } from 'storybook/test';

import { badge } from './use-connect-hint';

/**
 * The connect badge as the map shows it: beside the line's first point (a
 * drawn point's white disc and parabrand-800 rim), below and to its right,
 * where a pen tool marks the click that closes a path. On the map it is a
 * MapLibre marker; here the same element sits by a stand-in point.
 */
function ConnectHintPreview() {
  const spot = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = badge();
    spot.current?.appendChild(el);
    return () => el.remove();
  }, []);
  return (
    <div className="relative size-24 bg-surface-quaternary">
      <span className="absolute top-6 left-6 size-3 rounded-full bg-surface ring-[2.5px] ring-parabrand-800" />
      <div ref={spot} className="absolute top-[42px] left-[42px]" />
    </div>
  );
}

const meta = {
  title: 'Features/Studio/ConnectHint',
  component: ConnectHintPreview,
  parameters: { layout: 'centered' },
} satisfies Meta<typeof ConnectHintPreview>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Near the first point: the badge, hidden from screen readers (the toolbar's button says it). */
export const NearTheFirstPoint: Story = {
  play: async ({ canvasElement }) => {
    const hint = within(canvasElement).getByTestId('connect-hint');
    await expect(hint).toBeVisible();
    await expect(hint).toHaveAttribute('aria-hidden', 'true');
  },
};
