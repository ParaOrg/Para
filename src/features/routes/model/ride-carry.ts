/** A trip's picks, by row id: the start, the hintuan end and the end picked from its row. */
export interface RidePicks {
  start: string | null;
  picked: string | null;
  endPicked: 'from' | 'to' | null;
}

/**
 * SWITCH on a jeep's or the ferry's trip: the picks the way back carries over
 * (the owner's call: Antipolo → Betty Go becomes Recto → Betty Go). `land`
 * says where a picked row's place lands the other way, by its row id, or null
 * where it lands nowhere: where HintuanCard's SWITCH puts it
 * (boxTheOtherWay), the same box when the way back passes it, else the
 * nearest box of its place that it passes; with none, the ride turns whole. A
 * picked end follows its place: where the trip went is where the way back
 * leaves. A start and an end both picked swap (the owner's call): the way
 * back is the ride back, from where it ended to where it started; so do a
 * start and the destination picked as the end (the owner keeps the start),
 * the way back leaving from there. A start ridden back to the origin rides
 * the way the way back runs: it stays the start, and the origin, where the
 * way back goes, its end (Claude's call, which the owner kept: a swap would
 * start the way back at its own destination, which no start can).
 *
 * Returns the picks the way back starts with; a null one is not carried.
 * A train lets the picks go instead (useRideTo's carryTo).
 */
export function carryPicks(picks: RidePicks, land: (rowId: string) => string | null): RidePicks {
  const { start, picked, endPicked } = picks;
  if (picked !== null && start !== null) {
    // The ride back: the end lands as the start, the start as the end, each
    // on its place's box the other way passes. One that lands nowhere is let
    // go: the end alone is a ride from where the way back leaves, the start
    // alone no ride yet.
    return { start: land(picked), picked: land(start), endPicked: null };
  }
  if (start !== null && endPicked !== null) {
    const landed = land(start);
    // The ride back: from where the way back leaves to the start's place.
    if (endPicked === 'to') return { start: null, picked: landed, endPicked: null };
    // Back to the origin, against the trip: the way back's own way, to where it goes.
    return { start: landed, picked: null, endPicked: 'to' };
  }
  // A start alone goes the same way, kept a start (its place's box the other
  // way passes); with none, the ride leaves where the other way does.
  const startLanded = start === null ? null : land(start);
  if (picked !== null) return { start: startLanded, picked: land(picked), endPicked: null };
  if (endPicked === null) return { start: startLanded, picked: null, endPicked: null };
  return { start: startLanded, picked: null, endPicked: endPicked === 'to' ? 'from' : 'to' };
}
