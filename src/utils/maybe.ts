export type Maybe<T> = T | null | undefined;
export type Nilable<T> = Maybe<T>;
export type Nullable<T> = Exclude<Maybe<T>, undefined>;
export type Definitely<T extends Maybe<unknown>> = Exclude<T, null | undefined>;
export type Has<T> = { [P in keyof T]-?: Definitely<T[P]> };

/**
 * Indicate to TypeScript that you know for sure this `Maybe<T>` is actually not `null`, by implementation or other definition.
 */
export function forSure<T>(t: Maybe<T>): Definitely<T> {
  return t as Definitely<T>;
}

export function isNil<T>(t: Maybe<T>): t is null | undefined {
  return t === null || typeof t === 'undefined';
}

export function isNotNil<T>(t: Maybe<T>): t is Definitely<T> {
  return t !== null && typeof t !== 'undefined';
}

export function or<T>(otherwise: T): (t: Maybe<T>) => T {
  return t => t ?? otherwise;
}

type Key = string | number | symbol;
export function has<T, K extends keyof T>(t: T, ...k: K[]): t is T & Has<Pick<T, K>> {
  return k.every(key => isNotNil(t[key]));
}

export function hasKey<K extends Key>(...k: K[]): <T extends { [k in K]: unknown }>(t: T) => t is T & Has<Pick<T, K>> {
  return <T extends { [k in K]: unknown }>(t: T): t is T & Has<Pick<T, K>> => has(t, ...k);
}
