import { stationIndex } from './rail-fares';
import type { RailLine } from './routes';

/**
 * The station codes the signs carry, "Quezon Avenue YL02": a two-letter
 * line prefix and two digits, in a pill of the line's colour beside the
 * station's name. The owner's research of 2026-10-08 (Figma, the Research
 * page's "Research: train and ferry lines", 4029:4059) and Wikipedia's
 * Template:Manila MRT station code. GL is the Green Line, LRT-1; PL the
 * Purple Line, LRT-2; YL the Yellow Line, MRT-3. The ferry has no codes,
 * and PRFS is no RailLine, so it never asks here.
 *
 * The digits are the station's place in its line, counted from the north
 * or west end, and the tables in rail-fares know every station by its map
 * name and the operators' names. LRT-2's and MRT-3's tables run that way,
 * so a code is the index plus one: Recto PL01 to Antipolo PL13, North
 * Avenue YL01 to Taft Avenue YL13. LRT-1's runs the other way, Dr. Santos
 * first as LRMC's matrix has it, so its code counts down from the south
 * end: Dr. Santos GL26, EDSA GL20, Monumento GL04, Fernando Poe Jr. GL02.
 * GL01 is reserved for the North Triangle common station, not open.
 * Wikipedia's own pages disagree on whether Fernando Poe Jr. is GL01 or
 * GL02 (and Balintawak GL02 or GL03); the owner's table, FPJ GL02, wins.
 */

const PREFIX: Record<RailLine, string> = { 'LRT-1': 'GL', 'LRT-2': 'PL', 'MRT-3': 'YL' };

/** Dr. Santos's number, LRT-1's south end, from which the codes count down as the table counts up. */
const LRT1_SOUTH_END = 26;

/** A station's code, `GL02`, by any of its names; null when the line's table has no such station. */
export function stationCode(line: RailLine, name: string): string | null {
  const index = stationIndex(line, name);
  if (index < 0) return null;
  const number = line === 'LRT-1' ? LRT1_SOUTH_END - index : index + 1;
  return `${PREFIX[line]}${String(number).padStart(2, '0')}`;
}
