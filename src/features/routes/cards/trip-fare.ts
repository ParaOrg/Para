/** A ride's pesos both ways: `₱26` regular, and its discounted price — students, seniors, PWDs. */
export interface Fares {
  regular: string;
  discounted: string;
}
/**
 * A ride nobody pays for, the ferry's: the tile says Free, with no Regular or Discounted to turn.
 */
export const FREE = 'free';
export type Fare = Fares | typeof FREE;

/** The pesos a fare reads: Free for the ferry's, else the kind the rider picked. */
export function farePesos(fare: Fare, isDiscounted: boolean): string {
  if (fare === FREE) return 'Free';
  return isDiscounted ? fare.discounted : fare.regular;
}
