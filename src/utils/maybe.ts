export type Maybe<T> = T | null | undefined;

/**
 * Indicate to Typescript that you know for sure this `Maybe<T>` is actually not `null`, by implementation or other definition.
 */
export function forSure<T>(t: Maybe<T>): T {
  return t!; // eslint-disable-line @typescript-eslint/no-non-null-assertion
}
