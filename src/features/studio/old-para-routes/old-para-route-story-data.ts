import type { LngLat } from '@/shared/utils/geo';

import type { OldParaRoute, OldParaRouteSummary } from './old-para-route-schema';

/*
 * The old Para routes the stories share, shaped as the real index's: the UP Ikot with its line,
 * one never reviewed with no line, and one with neither line nor ends.
 */

/** A point `m` metres east of Philcoa, `n` north. */
export const at = (m: number, n = 0): LngLat => [121.0531 + m / 107_700, 14.6542 + n / 110_600];

export const IKOT: OldParaRouteSummary = {
  paraId: 'PARA-0001',
  mode: 'jeepney',
  name: 'UP - IKOT',
  isVerified: true,
  isLoop: true,
  isOneway: true,
  start: at(0),
  end: at(0),
  lengthM: 5029,
  gapCount: 0,
  coarse: [at(0), at(2000), at(2000, 1000), at(0)],
};

export const IKOT_FILE: OldParaRoute = {
  paraId: IKOT.paraId,
  oldId: '745e7a64-9f0a-4609-9b25-375d2a9c3887',
  name: IKOT.name,
  mode: 'jeepney',
  isVerified: true,
  isLoop: true,
  isOneway: true,
  start: at(0),
  end: at(0),
  lengthM: 5029,
  line: [at(0), at(1000), at(2000), at(2000, 1000), at(1000, 1000), at(0, 40)],
  gaps: [],
};

/** Never reviewed, no line, its ends known. */
export const NO_LINE: OldParaRouteSummary = {
  paraId: 'PARA-0049',
  mode: 'bus',
  name: 'Alabang (Starmall) Lagro',
  isVerified: false,
  isLoop: false,
  isOneway: false,
  start: at(0, -9000),
  end: at(3000, 12000),
  lengthM: null,
  gapCount: 0,
  coarse: null,
};

/** No line and neither end. */
export const NO_ENDS: OldParaRouteSummary = {
  ...NO_LINE,
  paraId: 'PARA-0731',
  mode: 'uv',
  name: 'Fairview - Ayala UV Express',
  start: null,
  end: null,
};

/** End to end, unverified, with a line that has one gap. */
export const CUBAO: OldParaRouteSummary = {
  paraId: 'PARA-0018',
  mode: 'jeepney',
  name: 'Cubao - Divisoria',
  isVerified: false,
  isLoop: false,
  isOneway: false,
  start: at(0),
  end: at(-9000, -4000),
  lengthM: 11200,
  gapCount: 1,
  coarse: [at(0), at(-9000, -4000)],
};

export const CUBAO_FILE: OldParaRoute = {
  ...IKOT_FILE,
  paraId: CUBAO.paraId,
  oldId: '0d1c6c3e-2f55-4d0f-9d56-0a1b3c4d5e6f',
  name: CUBAO.name,
  isVerified: false,
  isLoop: false,
  isOneway: false,
  end: CUBAO.end,
  lengthM: CUBAO.lengthM,
  line: [at(0), at(-3000, -1000), at(-6000, -2500), at(-9000, -4000)],
  gaps: [{ after: 1, metres: 60 }],
};
