import { createHashView } from './use-hash-view';

/** Whether Profile is showing, kept in the URL's `#profile`. */
export const useProfileView = createHashView('#profile');
