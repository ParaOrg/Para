/**
 * Keeps a sheet's handle shown, as keyboard focus shows it, from a press in the sheet until that
 * press's click has landed. The route list's handle is drawn only while focused from the keyboard
 * (BottomSheet's `handle="hidden"`), and in the flow: a tap that takes the focus from it would
 * fold it away between the finger lifting and the click, moving everything under the finger up by
 * its height, so the click would land on neither the card pressed nor the row now under it. Let
 * go at the click, or when the next press starts if none came (a drag sends none).
 */
export function holdShownUntilClick(handle: HTMLElement | null): void {
  if (!handle?.matches(':focus-visible')) return;
  handle.toggleAttribute('data-held', true);
  const letGo = () => {
    handle.removeAttribute('data-held');
    document.removeEventListener('click', letGo, true);
    document.removeEventListener('pointerdown', letGo, true);
  };
  // Caught as the click starts on its way down, when the browser has already chosen its target.
  document.addEventListener('click', letGo, true);
  // Bound after this press's own pointerdown, so only the next one ends it.
  setTimeout(() => document.addEventListener('pointerdown', letGo, true));
}
