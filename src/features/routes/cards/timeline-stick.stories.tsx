import type { Meta, StoryObj } from '@storybook/react-vite';
import type { ReactNode } from 'react';

import { TIMELINE_SURFACE } from './livery-card';
import { TimelineDot } from './timeline-route-detail';
import { TimelineStick } from './timeline-stick';

/**
 * The owner's TimelineStick set (3716:1759): every piece, Connected and
 * Disconnected, in red, the set's own colour, each in a row as tall as
 * Figma draws it (40; Top 62, Bottom 38). The rail breaks where a ride
 * starts and where it ends, and a start alone wears Disconnected (the owner,
 * 2026-10-16: "can you still connect those dots"; from 2026-10-15 every row
 * outside the ride wore it).
 */
const rail = TIMELINE_SURFACE.red;
const dot = <TimelineDot rail={rail} />;

const ROW_HEIGHT = {
  top: 'h-15.5',
  row: 'h-10',
  bottom: 'h-9.5',
} as const;

/** The piece in a row of its Figma height, on the red card. */
function Row({ height, children }: { height: keyof typeof ROW_HEIGHT; children: ReactNode }) {
  return (
    <div className={'flex w-12 bg-card-red-surface px-3 ' + ROW_HEIGHT[height]}>{children}</div>
  );
}

const meta = {
  title: 'Features/Routes/TimelineStick',
  component: TimelineStick,
} satisfies Meta<typeof TimelineStick>;

export default meta;
type Story = StoryObj<typeof TimelineStick>;

/** Top, Connected (3716:1755): the origin's dot, the rail leaving below it. */
export const TopConnected: Story = {
  render: () => (
    <Row height="top">
      <TimelineStick variant="top" rail={rail} dot={dot} />
    </Row>
  ),
};

/** Top, Disconnected (4137:10160): the origin's dot alone. */
export const TopDisconnected: Story = {
  render: () => (
    <Row height="top">
      <TimelineStick variant="top" connection="disconnected" rail={rail} dot={dot} />
    </Row>
  ),
};

/** MiddleTop, Connected (4122:8454): where a ride starts mid-list, the rail below only. */
export const MiddleTopConnected: Story = {
  render: () => (
    <Row height="row">
      <TimelineStick variant="middleTop" rail={rail} dot={dot} />
    </Row>
  ),
};

/** MiddleTop, Disconnected (4151:12981): the dot alone. */
export const MiddleTopDisconnected: Story = {
  render: () => (
    <Row height="row">
      <TimelineStick variant="middleTop" connection="disconnected" rail={rail} dot={dot} />
    </Row>
  ),
};

/** Middle, Connected (3716:1758): a hintuan along the ride, the rail through it. */
export const MiddleConnected: Story = {
  render: () => (
    <Row height="row">
      <TimelineStick variant="middle" rail={rail} dot={dot} />
    </Row>
  ),
};

/** Middle, Disconnected (4124:9096): a start alone, its dot alone. */
export const MiddleDisconnected: Story = {
  render: () => (
    <Row height="row">
      <TimelineStick variant="middle" connection="disconnected" rail={rail} dot={dot} />
    </Row>
  ),
};

/** MiddleBottom, Connected (4114:5603): where a ride ends mid-list, the rail above only. */
export const MiddleBottomConnected: Story = {
  render: () => (
    <Row height="row">
      <TimelineStick variant="middleBottom" rail={rail} dot={dot} />
    </Row>
  ),
};

/** MiddleBottom, Disconnected (4151:12971): the dot alone. */
export const MiddleBottomDisconnected: Story = {
  render: () => (
    <Row height="row">
      <TimelineStick variant="middleBottom" connection="disconnected" rail={rail} dot={dot} />
    </Row>
  ),
};

/** Bottom, Connected (3716:1756): the destination's dot, the rail arriving above it. */
export const BottomConnected: Story = {
  render: () => (
    <Row height="bottom">
      <TimelineStick variant="bottom" rail={rail} dot={dot} />
    </Row>
  ),
};

/** Bottom, Disconnected (4137:10169): the destination's dot alone. */
export const BottomDisconnected: Story = {
  render: () => (
    <Row height="bottom">
      <TimelineStick variant="bottom" connection="disconnected" rail={rail} dot={dot} />
    </Row>
  ),
};

/** Disclosure, Connected (3716:1757): a fold's row between rows on one side of the ride, the rail alone. */
export const DisclosureConnected: Story = {
  render: () => (
    <Row height="row">
      <TimelineStick variant="disclosure" rail={rail} />
    </Row>
  ),
};

/**
 * Disclosure, Disconnected (4137:10175): nothing drawn — beside the button
 * under a row the rail breaks after (× Remove as start under an S at the
 * ride's foot), and beside a fold's row next to the ride, open or closed
 * (the owner, 2026-10-16: "when close it should disconnect the disclosure";
 * 4194:13004 in 4194:12702).
 */
export const DisclosureDisconnected: Story = {
  render: () => (
    <Row height="row">
      <TimelineStick variant="disclosure" connection="disconnected" rail={rail} />
    </Row>
  ),
};

/** MiddleBottom with the Selected dot, as a picked hintuan wears it: the dot is the row's, the stretch the piece's. */
export const MiddleBottomSelected: Story = {
  render: () => (
    <Row height="row">
      <TimelineStick
        variant="middleBottom"
        rail={rail}
        dot={<TimelineDot rail={rail} selected />}
      />
    </Row>
  ),
};
