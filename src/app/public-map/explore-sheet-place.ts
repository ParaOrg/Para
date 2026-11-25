// How the explore cards and what rides on them are moved: written on the page, never read from it
// in a drag (useExploreSheet).

/** Whether `cards` lie along the map's bottom, as wide as it: a phone's layout, not floating. */
export function isAlongBottom(cards: HTMLElement, host: HTMLElement) {
  return cards.offsetWidth >= host.clientWidth;
}

/** What rides on the cards' top (`data-dock-follower`): the locate-me column. */
export function followersOf(host: HTMLElement) {
  return [...host.querySelectorAll<HTMLElement>('[data-dock-follower]')];
}

/** The cards slid `y` down, the foot `foot` tall: on the host at rest, and on what follows. */
export function place(
  cards: HTMLElement,
  host: HTMLElement,
  y: string,
  foot: string | null,
  followers = followersOf(host),
  isMove = false,
) {
  cards.style.setProperty('--explore-y', y);
  for (const el of isMove ? followers : [host, ...followers]) {
    if (foot === null) el.style.removeProperty('--dock-foot');
    else el.style.setProperty('--dock-foot', foot);
  }
}
