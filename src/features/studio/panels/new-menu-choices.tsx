import type { ReactNode } from 'react';

import { HintuanIcon, TerminalIcon } from '@/shared/ui/route-icons';

import { RouteLetterIcon } from './new-menu-icons';
import type { HotspotKind } from '../drawing/drawing-types';

/** What the + menu offers (NewMenu), in its order. */
export type NewChoice = 'route' | 'osm' | 'old-para' | HotspotKind;

interface Choice {
  choice: NewChoice;
  title: string;
  description: string;
  icon: ReactNode;
  /** Figma's letter colours: blue-700 for routes; a terminal's and a hintuan's own colours. */
  iconClassName: string;
}

export const CHOICES: Choice[] = [
  {
    choice: 'route',
    title: 'Routes',
    description: 'Lines you can ride by jeep, e-jeep, UV Express or bus.',
    icon: <RouteLetterIcon />,
    // No token holds the route letter's blue yet.
    iconClassName: 'text-blue-700',
  },
  {
    choice: 'osm',
    title: 'Route from OSM',
    description: 'Start a route from an OpenStreetMap route’s line. A placeholder look.',
    icon: <RouteLetterIcon />,
    iconClassName: 'text-blue-700',
  },
  {
    choice: 'old-para',
    title: 'Route from old Para',
    description: 'Start a route from one of the old Para app’s routes. A placeholder look.',
    icon: <RouteLetterIcon />,
    iconClassName: 'text-blue-700',
  },
  {
    choice: 'terminal',
    title: 'Terminal',
    description: 'Where rides start, wait and fill up with passengers.',
    icon: <TerminalIcon />,
    iconClassName: 'text-map-hotspots-card-terminal-surface',
  },
  {
    choice: 'hintuan',
    title: 'Hintuan',
    description: 'Places along the way where you can wait and get on.',
    icon: <HintuanIcon />,
    iconClassName: 'text-map-hotspots-card-hintuan-surface',
  },
];
