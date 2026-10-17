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
