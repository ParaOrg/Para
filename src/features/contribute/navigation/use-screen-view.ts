import { createHashView, type HashView } from './hash-view';
import { SCREENS } from './screen-routes';

/*
 * Made once, here, for every screen a hash opens: each keeps its own store, and the page and
 * Account read the same one for the same screen. Record has none: it is the page with no hash.
 */
const SCREEN_VIEWS = {
  history: createHashView(SCREENS.history.hash),
  profile: createHashView(SCREENS.profile.hash),
  accountSettings: createHashView(SCREENS.accountSettings.hash),
  changePassword: createHashView(SCREENS.changePassword.hash),
  deleteAccount: createHashView(SCREENS.deleteAccount.hash),
};

type HashScreenName = keyof typeof SCREEN_VIEWS;

/** Whether `screen` is showing, kept in the URL's hash, with the moves to and from it. */
export function useScreenView(screen: HashScreenName): HashView {
  return SCREEN_VIEWS[screen]();
}
