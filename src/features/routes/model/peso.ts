/** `₱14`, `₱18.50`. */
export function peso(centavos: number): string {
  return centavos % 100 === 0 ? `₱${centavos / 100}` : `₱${(centavos / 100).toFixed(2)}`;
}

/**
 * `₱26` or `₱26–28`, in whole pesos: the low end rounded down, the high end
 * up, so the range still holds the fare — a discounted ₱19.25–20.75 is
 * `₱19–21`: the cards never show decimals (the owner's rule).
 */
export function pesoRange(low: number, high: number): string {
  const lo = Math.floor(low / 100);
  const hi = Math.ceil(high / 100);
  return lo === hi ? `₱${lo}` : `₱${lo}–${hi}`;
}
