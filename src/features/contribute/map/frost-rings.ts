/** The paused frost's tuning, in one place (map-frost.tsx). */
export const FROST = {
  /**
   * How blurred the map is, step by step out from the clear middle round the rider's dot, in
   * pixels: the first step's ring has the first, the far edge of the map the last. Three steps
   * instead of four cost a layer less to draw.
   */
  levelsPx: [2, 4, 6, 8],
  /** The least clear radius round the rider's dot, in pixels: the accuracy ring when it is wider. */
  clearMinPx: 80,
} as const;

/** Where the frost clears, on the map's canvas, in CSS pixels. */
export interface FrostCentre {
  x: number;
  y: number;
  /** The clear radius round it. */
  clearPx: number;
  /** The map's canvas. */
  width: number;
  height: number;
}

/** One of the frost's layers: its own blur, and where its mask goes from clear to whole. */
export interface FrostRing {
  /** The blur the map has reached once this layer is whole, from FROST.levelsPx. */
  levelPx: number;
  blurPx: number;
  fromPx: number;
  toPx: number;
}

/**
 * The frost's layers, innermost first. Backdrop blurs drawn one over another compound (blurs of
 * a and b make one of √(a² + b²)), so each layer adds only what takes the one under it to the
 * next level, and the map reaches each level of FROST.levelsPx in its turn: the clear radius to
 * the farthest corner is cut in as many even rings, each layer fading in across its own.
 */
export function frostRings(
  centre: FrostCentre,
  levelsPx: readonly number[] = FROST.levelsPx,
): FrostRing[] {
  const corners = [
    [0, 0],
    [centre.width, 0],
    [0, centre.height],
    [centre.width, centre.height],
  ];
  const farPx = Math.max(
    centre.clearPx + 1,
    ...corners.map(([x, y]) => Math.hypot(x - centre.x, y - centre.y)),
  );
  const step = (farPx - centre.clearPx) / levelsPx.length;
  return levelsPx.map((level, index) => {
    const under = index === 0 ? 0 : levelsPx[index - 1];
    return {
      levelPx: level,
      blurPx: Math.sqrt(level * level - under * under),
      fromPx: centre.clearPx + step * index,
      toPx: centre.clearPx + step * (index + 1),
    };
  });
}
