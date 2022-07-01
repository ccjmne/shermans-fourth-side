export const ε0 = 1e-15; // zero by all intents and purposes. Near-zero values get mishandled by javascript's `number` arithmetic
export const εθ = Math.PI / 180; // 1 degree

/**
 * Whether `a` and `b` are equal, within the `ε` margin.
 * @returns `true` iff `0 ≤ |a - b| ≤ ε`
 */
export function isNearly(a: number, b: number, ε: number = ε0): boolean {
  return (Δ => Δ <= ε && Δ >= 0)(Math.abs(a - b));
}
