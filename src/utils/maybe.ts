export type Maybe<T> = T | null | undefined;
export type Nilable<T> = Maybe<T>;
export type Nullable<T> = T | null;

/**
 * Indicate to TypeScript that you know for sure this `Maybe<T>` is actually not `null`, by implementation or other definition.
 */
export function forSure<T>(t: Maybe<T>): T {
  return t as T;
}

export function isNil<T>(t: Maybe<T>): t is null | undefined {
  return t === null || typeof t === 'undefined';
}

export function isNotNil<T>(t: Maybe<T>): t is T {
  return t !== null && typeof t !== 'undefined';
}

export function or<T>(otherwise: T): (t: Maybe<T>) => T {
  return t => t ?? otherwise;
}
