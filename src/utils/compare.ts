export const ε0 = 1e-15; // zero by all intents and purposes. Near-zero values get mishandled by javascript's `number` arithmetic
export const εθ = 1e-5; // more generous match for angles

/**
 * Whether `a` and `b` are equal, within the `ε` margin.
 * @returns `true` iff `0 ≤ |a - b| ≤ ε`
 */
export function isNearly(a: number, b: number, ε: number = ε0): boolean {
  return Math.abs(a - b) <= ε;
}

/**
 * Whether `a` is less then `b`, by at least `ε`.
 * @returns `true` iff `a + ε < b`
 */
export function isLessThan(a: number, b: number, ε: number = ε0): boolean {
  return a + ε < b;
}

/**
 * Whether `a` is greater then `b`, by at least `ε`.
 * @returns `true` iff `a - ε > b`
 */
export function isGreaterThan(a: number, b: number, ε: number = ε0): boolean {
  return a - ε > b;
}

export function equals<O extends object>(a: O, b: O): boolean {
  return Object.keys(a).length === Object.keys(b).length && Object.entries(a).every(([k, v]) => b[k] === v);
}

type Key = string | number | symbol;
export function equalsBy<K extends Key>(...k: K[]): <O extends { [k in K]: unknown }>(a: O, b: O) => boolean {
  return <O extends { [k in K]: unknown }>(a: O, b: O) => k.every(key => a[key] === b[key]);
}
