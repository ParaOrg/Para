/*
 * What the phone's Back and the keyboard's Escape do to a stop's note being written, on the note
 * card and in place on Stops notes alike. Both sit a press away from closing the keyboard, so one
 * press too many must never lose what was typed: a note typed into stays open and the person
 * chooses with Save or Cancel. Cancel itself discards with no question.
 */

/** Whether Back or Escape cancels a note: only one left as it was. One typed into stays open. */
export const backCancelsNote = (typed: string, saved: string): boolean => typed === saved;
