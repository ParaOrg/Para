/** A layer as twinsOf copies it: its type and its paint, read off MapLibre's layer as unknown. */
export interface PaintedSpec {
  type: string;
  paint: object | undefined;
}

const isObject = (value: unknown): value is object => typeof value === 'object' && value !== null;

/**
 * The type and paint of `layer` as MapLibre serializes it (or the layer itself, for a stand-in
 * that has no serialize), or null for no layer or one with no paint.
 */
export function specOf(layer: unknown): PaintedSpec | null {
  const spec: unknown =
    isObject(layer) && 'serialize' in layer && typeof layer.serialize === 'function'
      ? Reflect.apply(layer.serialize, layer, [])
      : layer;
  if (!isObject(spec) || !('paint' in spec) || !('type' in spec)) return null;
  if (typeof spec.type !== 'string') return null;
  return { type: spec.type, paint: isObject(spec.paint) ? spec.paint : undefined };
}
