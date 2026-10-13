import type { Meta, StoryObj } from '@storybook/react-vite';
import type { ComponentType } from 'react';

import * as routeIcons from './route-icons';

/** Every icon the file draws, by the name it is exported as: read off the module, so a new one shows here too. */
const ICONS: readonly { name: string; Icon: ComponentType }[] = Object.entries(routeIcons).map(
  ([name, Icon]) => ({ name, Icon }),
);

type Ground = 'primary' | 'inverse';
/** The two inks Figma draws them in, each on a ground it is read against. */
const GROUND = {
  primary: 'bg-surface text-content-primary',
  inverse: 'bg-card-red-surface text-content-inverse',
} satisfies Record<Ground, string>;

type Size = 'small' | 'large';
/** 20 is the size the cards' rows draw them at, 24 the header's. */
const SIZE = { small: 'size-5', large: 'size-6' } satisfies Record<Size, string>;

interface SheetProps {
  ground: Ground;
  size: Size;
}

/**
 * The set, one cell each: the icons have no colour of their own (currentColor),
 * so the sheet's ground decides it, as a card's text colour does in the app.
 */
function IconSheet({ ground, size }: SheetProps) {
  return (
    <ul className={'grid grid-cols-3 gap-4 p-4 sm:grid-cols-4 ' + GROUND[ground]}>
      {ICONS.map(({ name, Icon }) => (
        <li key={name} className="flex flex-col items-center gap-2 text-center text-xs">
          <span className={'grid place-items-center *:size-full ' + SIZE[size]}>
            <Icon />
          </span>
          {name}
        </li>
      ))}
    </ul>
  );
}

const meta = {
  title: 'Shared/UI/RouteIcons',
  component: IconSheet,
  args: { ground: 'primary', size: 'large' },
} satisfies Meta<typeof IconSheet>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Content/primary on Surface: the cards' rows and headers. */
export const Primary: Story = {};

/** Content/inverse on a livery's surface: the same drawings, taking the card's white words. */
export const Inverse: Story = { args: { ground: 'inverse' } };

/** At 20, as the rows draw circle-arrow-right, Terminal and Hintuan. */
export const Small: Story = { args: { size: 'small' } };
