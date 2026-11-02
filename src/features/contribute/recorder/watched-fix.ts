/** The part of a position the recorder uses; the browser's and the app's both fit it. */
export interface WatchedFix {
  timestamp: number;
  coords: { longitude: number; latitude: number; accuracy: number };
}

/** A failed location request: 1 denied, 2 unavailable, 3 timed out, as the browser numbers them. */
export interface WatchError {
  code: number;
  message: string;
}
