/*
 * What the phone's Back does to a stop's note being written, on the note card and in place on
 * Stops notes alike. Back sits a press away from the keyboard's own Back, so one press too many
 * must never lose what was typed: a note typed into stays open and the person chooses with Save or
 * Cancel. Cancel itself discards with no question.
 */

/** Whether Back cancels a note: only one left as it was. A note typed into stays open, kept. */
export const backCancelsNote = (typed: string, saved: string): boolean => typed === saved;
