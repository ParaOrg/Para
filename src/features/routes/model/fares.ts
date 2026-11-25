import { pesoRange } from './peso';
import type { TransportMode } from './routes';

/**
 * LTFRB's jeepney fare rule, the "add-on method": a minimum for the first
 * km, then a fixed amount for each km after, rounded to the nearest 25
 * centavos. The 20% discount (students, seniors, PWDs) is taken before the
 * rounding. Checked against all 150 rows of the 2023 fare guides; see
 * docs/research/ltfrb-jeepney-fares.md. Amounts in centavos, so the rounding
 * never meets a float.
 */
interface FareRule {
  /** The first day it applies, Manila time, `YYYY-MM-DD`. */
  from: string;
  minimum: number;
  minimumKm: number;
  perKm: number;
  /** Where the numbers come from, as the card says it. */
  source: string;
}

/**
 * Traditional jeepney (PUJ, Mega Manila), newest last. Only the traditional
 * class for now (the owner's call). When LTFRB changes the fare, add a row:
 * the card switches on its date by itself.
 */
export const TRADITIONAL: FareRule[] = [
  {
    from: '2023-10-08',
    minimum: 1300,
    minimumKm: 4,
    perKm: 180,
    source: 'LTFRB fare guide of 8 Oct 2023',
  },
  // LTFRB's PUJ General Fare Guide, effective 2026-09-28; fares-test holds
  // its whole table and every row reproduces. The guide prints the discount
  // rule unrounded (11.20 + 1.60); its rows round.
  {
    from: '2026-09-28',
    minimum: 1400,
    minimumKm: 4,
    perKm: 200,
    source: 'LTFRB fare guide effective 28 Sep 2026',
  },
];

/**
 * The EDSA Carousel (the busway), newest last: LTFRB's matrix effective 2026-09-28, ₱18.00 for
 * the first 5 km and ₱2.98 for each km after; discounted ₱14.40 + ₱2.38, the same 20% off, so the
 * add-on method above prices it. Rounded to the 25 centavos, the discounted minimum is ₱14.50, as
 * LTFRB's published grid prints it. Sources: PTV News, 28 Sep 2026; DZRH, 30 Sep 2026.
 */
export const CAROUSEL: FareRule[] = [
  {
    from: '2026-09-28',
    minimum: 1800,
    minimumKm: 5,
    perKm: 298,
    source: 'LTFRB EDSA Carousel fare matrix effective 28 Sep 2026',
  },
];

const DISCOUNT = 0.2;
const ROUND_TO = 25;
/** How long after a change the card warns that some jeeps still charge the old fare (§1.6). */
const GRACE_DAYS = 30;

/** Today in Manila, `YYYY-MM-DD`: the fare changes at Manila's midnight. */
export function manilaDate(now = new Date()): string {
  return new Date(now.getTime() + 8 * 3600_000).toISOString().slice(0, 10);
}

/** The rule in force on `date`, and the one before it while it is still new. */
export function ruleOn(
  date: string,
  rules = TRADITIONAL,
): { rule: FareRule; previous: FareRule | null } | null {
  let i = rules.length - 1;
  while (i >= 0 && rules[i].from > date) i--;
  if (i < 0) return null;
  const previous = rules[i - 1] ?? null;
  const days = (Date.parse(date) - Date.parse(rules[i].from)) / 86_400_000;
  return { rule: rules[i], previous: previous && days < GRACE_DAYS ? previous : null };
}

/** The fare for a ride of `km` whole kilometres, regular and discounted, in centavos. */
export function fareForKm(km: number, rule: FareRule): { regular: number; discounted: number } {
  const exact = rule.minimum + rule.perKm * Math.max(0, km - rule.minimumKm);
  const round = (c: number) => Math.round(c / ROUND_TO) * ROUND_TO;
  return { regular: round(exact), discounted: round(exact * (1 - DISCOUNT)) };
}

/**
 * The fare for a ride of `metres`, as a range: nobody has published whether a
 * part km counts up or down, so both sides are given, and they are the same
 * number whenever it makes no difference (every ride up to the minimum's km).
 */
export function fareFor(metres: number, rule: FareRule) {
  const km = metres / 1000;
  const low = fareForKm(Math.floor(km), rule);
  const high = fareForKm(Math.ceil(km), rule);
  return { low, high };
}

/**
 * The fare rules that price a mode: the traditional jeepney's, the EDSA Carousel's; none for the
 * rest. An e-jeepney's class depends on its aircon, which the route does not record.
 */
export function rulesFor(mode: TransportMode | undefined): FareRule[] | null {
  if (mode === 'jeepney') return TRADITIONAL;
  if (mode === 'busway') return CAROUSEL;
  return null;
}

/** Whether a fare rule prices the mode. */
export function hasFareRule(mode: TransportMode | undefined): boolean {
  return rulesFor(mode) !== null;
}

/**
 * One ride of `metres` by `mode`, as the cards write pesos — `₱14`, `₱24–26`
 * — or nothing when no fare rule prices the mode. A range (the part km
 * counted down and up, fareFor) in whole pesos (pesoRange), on the discounted
 * fare too, because the range helps a commuter (the owner's call). The trip
 * card's Expected fare over its whole ride, and its pill's over a picked one
 * (Figma's TimelineRouteDetailCard, 3778:3183); a train's are railFares'. The
 * trip card is the only place the public map shows pesos: the owner's
 * RouteCard State set has none. The studio keeps its own fare details, under
 * the trip card (RouteFacts).
 */
export function rideFare(
  mode: TransportMode | undefined,
  metres: number,
  date = manilaDate(),
  kind: 'regular' | 'discounted' = 'regular',
): string | undefined {
  const rules = rulesFor(mode);
  const today = rules && ruleOn(date, rules);
  if (!today) return undefined;
  const { low, high } = fareFor(metres, today.rule);
  return pesoRange(low[kind], high[kind]);
}
