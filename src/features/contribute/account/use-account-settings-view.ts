import { createHashView } from '../common/hash-view';

/** Whether Account settings is showing, over Account, kept in the URL's `#account-settings`. */
export const useAccountSettingsView = createHashView('#account-settings');
