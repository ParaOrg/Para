import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';

import { Button } from './button';
import type { CardFill } from './button-look';

/** The set's default icon is a navigation arrow; any square SVG in currentColor works. */
const NavIcon = (
  <svg viewBox="0 0 20 20" fill="currentColor">
    <path d="M17.8 2.2a.75.75 0 0 1 .17.8l-5.6 14.4a.75.75 0 0 1-1.4-.03l-2.03-5.55-5.55-2.03a.75.75 0 0 1-.03-1.4L17 2.03a.75.75 0 0 1 .8.17Z" />
  </svg>
);

/** Each card fill on the card it belongs to: the card's surface, and its words. */
const CARD_FILLS = [
  { fill: 'card-red', card: 'bg-card-red-surface text-content-inverse' },
  { fill: 'card-orange', card: 'bg-card-orange-surface text-content-inverse' },
  { fill: 'card-violet', card: 'bg-card-violet-surface text-content-inverse' },
  { fill: 'card-rose', card: 'bg-card-rose-surface text-content-inverse' },
  { fill: 'card-fuchsia', card: 'bg-card-fuchsia-surface text-content-inverse' },
  { fill: 'card-pink', card: 'bg-card-pink-surface text-content-inverse' },
  {
    fill: 'map-rail-light-rail-way-one',
    card: 'bg-map-rail-light-rail-way-one-surface text-content-inverse',
  },
  {
    fill: 'map-rail-light-rail-way-two',
    card: 'bg-map-rail-light-rail-way-two-surface text-content-inverse',
  },
  {
    fill: 'map-rail-metro-rail-way-three',
    card: 'bg-map-rail-metro-rail-way-three-surface text-content-primary',
  },
] as const satisfies readonly { fill: CardFill; card: string }[];

const meta = {
  title: 'DesignSystem/Primitives/Button',
  component: Button,
  args: {
    variant: 'special',
    label: 'Button',
    firstIcon: NavIcon,
    lastIcon: NavIcon,
    onClick: fn(),
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * The jeepney pill: SN Pro Bold on the quiet surface, lit from above with a
 * hairline edge. Hover deepens the glow; press sinks it. The three shadows
 * sit side by side on Foundation/Tokens.
 */
export const Special: Story = {};

/** Special's surface and shadows in SN Pro Medium: the quieter of a pair, beside a Primary (3732:2512). */
export const Secondary: Story = { args: { variant: 'secondary' } };

/** Brand blue, SN Pro Medium, bevelled. Hover lights it from the top; press darkens and sinks it. */
export const Primary: Story = { args: { variant: 'primary' } };

/** The destructive red, on Primary's shadows. Press darkens to Error/surface-secondary. */
export const Error: Story = { args: { variant: 'error' } };

/** Small exists for Special, Secondary and Primary — on Error it is a compile error. */
export const SpecialSmall: Story = { args: { variant: 'special', size: 'small' } };

export const SecondarySmall: Story = { args: { variant: 'secondary', size: 'small' } };

/**
 * Primary at Small's sizes (3742:1196); the timeline's "Set as start" wears it
 * on cards (PrimarySmallOnCards).
 */
export const PrimarySmall: Story = { args: { variant: 'primary', size: 'small' } };

/** Primary Small's Disabled (3742:1208): Primary's Rest look at the set's opacity/60. */
export const PrimarySmallDisabled: Story = {
  args: { variant: 'primary', size: 'small', disabled: true },
};

/**
 * Primary Small's states side by side: Default and Disabled. Hover (3742:1200)
 * and Pressed (3742:1204) are the pointer's own — hover or press the first —
 * since this Storybook has no addon to force a pseudo-class.
 */
export const PrimarySmallStates: Story = {
  render: () => (
    <div className="flex items-center gap-3">
      <Button
        variant="primary"
        size="small"
        label="Button"
        firstIcon={NavIcon}
        lastIcon={NavIcon}
      />
      <Button
        variant="primary"
        size="small"
        label="Button"
        firstIcon={NavIcon}
        lastIcon={NavIcon}
        disabled
      />
    </div>
  ),
};

/**
 * Primary Small on a card, in the card's colours since it sits on top of the
 * card (4147:11947): each fill on its own card, its words the card's. Press
 * one: it darkens to the card's Timeline/surface.
 */
export const PrimarySmallOnCards: Story = {
  render: () => (
    <div className="grid w-[390px] grid-cols-2 gap-2">
      {CARD_FILLS.map(({ fill, card }) => (
        <div key={fill} className={'flex items-center rounded-2xl p-4 ' + card}>
          <Button
            variant="primary"
            size="small"
            fill={fill}
            label="Set as start"
            firstIcon={NavIcon}
          />
        </div>
      ))}
    </div>
  ),
};

/** The set's opacity/60, communicated to the browser too, not just greyed. */
export const Disabled: Story = {
  render: () => (
    <div className="flex gap-3">
      <Button variant="special" label="Button" firstIcon={NavIcon} lastIcon={NavIcon} disabled />
      <Button variant="secondary" label="Button" firstIcon={NavIcon} lastIcon={NavIcon} disabled />
      <Button variant="primary" label="Button" firstIcon={NavIcon} lastIcon={NavIcon} disabled />
      <Button variant="error" label="Button" firstIcon={NavIcon} lastIcon={NavIcon} disabled />
    </div>
  ),
};

/** Both icon slots are optional; the label alone is a complete button. */
export const LabelOnly: Story = {
  args: { variant: 'special', firstIcon: undefined, lastIcon: undefined },
};

/** One of each, side by side, as the set's sheet shows them. */
export const AllVariants: Story = {
  render: () => (
    <div className="flex items-center gap-3">
      <Button variant="special" label="Button" firstIcon={NavIcon} lastIcon={NavIcon} />
      <Button variant="secondary" label="Button" firstIcon={NavIcon} lastIcon={NavIcon} />
      <Button variant="primary" label="Button" firstIcon={NavIcon} lastIcon={NavIcon} />
      <Button variant="error" label="Button" firstIcon={NavIcon} lastIcon={NavIcon} />
    </div>
  ),
};

/**
 * A real specimen: the studio's card-actions row, at phone width over a
 * map-coloured box, the way CardActions lays out Edit, Extend and Delete —
 * Primary, Secondary and Error.
 */
export const CardActionsSpecimen: Story = {
  render: () => (
    <div className="@container relative h-56 w-[390px] overflow-hidden bg-neutral-200">
      <div className="absolute inset-x-3 bottom-3 rounded-xl bg-surface p-4 shadow-xl">
        <p className="mb-3 font-sn-pro text-sm text-content-tertiary">Tala → SM Fairview</p>
        <div className="flex gap-2">
          <Button variant="primary" label="Edit route" />
          <Button variant="secondary" label="Extend" />
          <Button variant="error" label="Delete" />
        </div>
      </div>
    </div>
  ),
};
