/**
 * A note the map's locator has for the contributor, such as location being off when the locate
 * button is tapped. The feature's own shape, since it may not import the locator's: the shell
 * passes the locator's notes in, and the compiler checks there that they fit.
 */
export interface MapNote {
  id: 'location';
  title: string;
  body: string;
}

/** The note the locator has now, and how many times it has been given: each tap gives it again. */
export interface MapNoteGiven {
  note: MapNote;
  timesGiven: number;
}
