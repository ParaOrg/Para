import type { PageProblem } from './page-problem';

/** Said while a recording runs with the screen free to sleep: the wake lock was refused. */
export const SCREEN_AWAKE_PROBLEM: PageProblem = {
  id: 'screen-awake',
  icon: 'warning',
  title: 'Screen may sleep',
  body: 'It could not be kept awake, so recording may stop when it sleeps.',
};
