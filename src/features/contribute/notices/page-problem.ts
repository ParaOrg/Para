/** The drawing a problem's toast leads with: location for the phone's position, warning else. */
export type PageProblemIcon = 'location' | 'warning';

/**
 * Something wrong the contributor should know, said in a toast at the top of the page until it is
 * closed or fixed. `id` names the kind of problem, so a fixed one is taken away by it.
 */
export interface PageProblem {
  id: string;
  icon: PageProblemIcon;
  /** One line: what happened. */
  title: string;
  /** One more line, if any: what to do about it. */
  body?: string;
}
