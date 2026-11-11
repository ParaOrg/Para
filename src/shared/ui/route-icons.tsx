/**
 * The route cards' icons, each Figma's own path in route-icons.svg (the vehicles' in
 * vehicle-icons.svg): a file the page fetches, not paths in its JS, which would count against the
 * public page's budget. Each fills with currentColor, taking the text colour of wherever it sits.
 */

import routeSprite from './route-icons.svg?url&no-inline';
import vehicleSprite from './vehicle-icons.svg?url&no-inline';

/** Each drawing in route-icons.svg, by its symbol's id, with the symbol's own box. */
const ROUTE_SPRITE_VIEW_BOX = {
  jeep: '0 0 24 24',
  close: '0 0 24 24',
  'chevron-left': '0 0 24 24',
  'chevron-down': '0 0 20 20',
  reload: '0 0 16 16',
  terminal: '0 0 20 20',
  hintuan: '0 0 20 20',
  information: '0 0 24 24',
  start: '0 0 24 24',
  end: '0 0 24 24',
  'close-large': '0 0 28 28',
  'arrow-left-right-large': '0 0 28 28',
  'filter-large': '0 0 28 28',
  'arrow-up-down': '0 0 20 20',
} as const;

type RouteSpriteId = keyof typeof ROUTE_SPRITE_VIEW_BOX;

interface RouteSpriteIconProps {
  /** The drawing's id in route-icons.svg. */
  id: RouteSpriteId;
}

/** A drawing from route-icons.svg, in currentColor, filling the icon's size. */
function RouteSpriteIcon({ id }: RouteSpriteIconProps) {
  return (
    <svg viewBox={ROUTE_SPRITE_VIEW_BOX[id]} fill="currentColor" aria-hidden>
      <use href={`${routeSprite}#${id}`} />
    </svg>
  );
}

/** The side-on jeep, beside a hintuan card's count. */
export function JeepIcon() {
  return <RouteSpriteIcon id="jeep" />;
}

/** ✕: a card's close, and Remove as start on a trip's row. */
export function CloseIcon() {
  return <RouteSpriteIcon id="close" />;
}

/** ‹, back to the card behind. */
export function ChevronLeftIcon() {
  return <RouteSpriteIcon id="chevron-left" />;
}

/** The chevron on the row that folds a trip's hintuans; turned up when they are open. */
export function ChevronDownIcon() {
  return <RouteSpriteIcon id="chevron-down" />;
}

/** Figma's Reload (3807:5509), 16 across: the fare tile's turn between Regular and Discounted fare. */
export function ReloadIcon() {
  return <RouteSpriteIcon id="reload" />;
}

/**
 * Figma's Terminal and Hintuan (HotspotSelectionBar, 3854:12690), 20 across:
 * a disc with the letter cut out, before each box's name on a HintuanCard — T
 * for a terminal, H for a hintuan.
 */
export function TerminalIcon() {
  return <RouteSpriteIcon id="terminal" />;
}

/** The H disc before a hintuan's name on a HintuanCard (TerminalIcon's pair). */
export function HintuanIcon() {
  return <RouteSpriteIcon id="hintuan" />;
}

/** Figma's Information, 24 across: the HintuanCard's ⓘ, its drawing inset 1.6 as the file places it. */
export function InformationIcon() {
  return <RouteSpriteIcon id="information" />;
}

/**
 * Figma's Start and End (4055:6468 and 4055:6446): a disc with the letter cut
 * out, 24 wherever it is drawn (the map's labels, a station's disc, a trip's
 * rows) — S before the name of where a ride starts, E before where
 * it goes, and before the picked hintuan's, where the ride now ends.
 */
export function StartIcon() {
  return <RouteSpriteIcon id="start" />;
}

/** The E disc before where a ride ends (StartIcon's pair). */
export function EndIcon() {
  return <RouteSpriteIcon id="end" />;
}

/**
 * The vehicles at the top of a trip's card (RouteStopsCardHeader), a card's
 * mode (RouteCardMode), Figma's own drawings at 32
 * across: Train (4170:7029), Jeep (4188:11144, here JeepneyIcon, not the
 * side-on Jeep above), EJeep (4188:11168), Bus (4188:11156), Ferry
 * (4189:11183) and UV Express (4236:17067, drawn at 24). They live in one sprite the page fetches, not as paths in its
 * JS, the owner's pick (inline, they took the public page over its 400 kB),
 * so Figma's paths keep their full precision. Its file is hashed, and the
 * offline precache holds it. Each draws in currentColor; the opacity is the
 * caller's.
 */
type SpriteId = 'train' | 'jeepney' | 'e-jeep' | 'bus' | 'ferry' | 'uv-express';

interface SpriteIconProps {
  id: SpriteId;
}

function SpriteIcon({ id }: SpriteIconProps) {
  return (
    <svg viewBox="0 0 32 32" fill="currentColor" aria-hidden>
      <use href={`${vehicleSprite}#${id}`} />
    </svg>
  );
}

/** The train, from the vehicle sprite. */
export function TrainIcon() {
  return <SpriteIcon id="train" />;
}

/** The jeepney, from the vehicle sprite. */
export function JeepneyIcon() {
  return <SpriteIcon id="jeepney" />;
}

/** The e-jeep, from the vehicle sprite. */
export function EJeepIcon() {
  return <SpriteIcon id="e-jeep" />;
}

/** The bus, from the vehicle sprite. */
export function BusIcon() {
  return <SpriteIcon id="bus" />;
}

/** The ferry, from the vehicle sprite. */
export function FerryIcon() {
  return <SpriteIcon id="ferry" />;
}

/** The UV Express van, from the vehicle sprite. */
export function UvExpressIcon() {
  return <SpriteIcon id="uv-express" />;
}

/** Figma's closeLarge (4633:22012), 28 across: the route list Controller's ✕. */
export function CloseLargeIcon() {
  return <RouteSpriteIcon id="close-large" />;
}

/** Figma's arrow-left-right-large (4633:22014), 28 across: the Controller's ⇆, every route the other way round. */
export function ArrowLeftRightIcon() {
  return <RouteSpriteIcon id="arrow-left-right-large" />;
}

/** Figma's arrow-up-down, 20 across: the ⇅ on a trip's ends card, turning the trip round. */
export function ArrowUpDownIcon() {
  return <RouteSpriteIcon id="arrow-up-down" />;
}

/** Figma's filter-large (4633:22015), 28 across: the Controller's sliders, opening the route list's filter. */
export function FilterIcon() {
  return <RouteSpriteIcon id="filter-large" />;
}
