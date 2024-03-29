import { Definitely, Maybe } from './maybe';

// Modified from https://github.com/Microsoft/TypeScript/issues/26223 and https://stackoverflow.com/a/52490977/2427596
// to allow for 'const' inference of `N` when passing the `Tuple` as argument.
type TupleRec<T, N extends number, R extends unknown[]> = R['length'] extends N ? R : TupleRec<T, N, [T, ...R]>;
export type Tuple<T, N extends number> = N extends N ? number extends N ? T[] : { length: N } & TupleRec<T, N, []> : never;

// All the ECMAScript primitive data types
// See https://developer.mozilla.org/en-US/docs/Glossary/Primitive
type Primitive = string | number | bigint | boolean | undefined | symbol | null;
// All the naturally comparable data types (i.e.: who work as expected with `>`)
type Natural = Exclude<Primitive, symbol | null | undefined> | { valueOf: () => number };

export function range(length: number, { offset = 0, step = 1 }: { offset?: number, step?: number } = {}): number[] {
  return Array.from({ length }, (_, i) => offset + i * step);
}

export function identity<T, U = T>(t: T): U {
  return t as unknown as U;
}

export function sum<T>(items: T[], by: (item: T) => number): number;
export function sum<T extends number>(items: T[], by?: (item: T) => number): number;
export function sum<T>(items: T[], by: (item: T) => number = identity): number {
  return items.reduce((total, item) => total + by(item), 0);
}

export function split<T, U = T[]>(items: T[], chunkSize: number, mapper: (chunk: T[]) => U = identity, stripRemainder = false): U[] {
  const { chunks: res, buffer: remainder } = items.reduce(
    ({ chunks, buffer }, item: T) => (buffer.push(item) === chunkSize
      ? { chunks: [...chunks, mapper(buffer)], buffer: [] }
      : { chunks, buffer }),
    { chunks: [] as U[], buffer: [] as T[] },
  );

  return (stripRemainder || !remainder.length) ? res : [...res, mapper(remainder)];
}

export function mapValues<V, W>(object: Record<string, V>, by: (value: V, key: string) => W): Record<string, W> {
  return Object.fromEntries(
    Object.entries(object).map(([k, v]) => [k, by(v, k)]),
  );
}

export function mapTuple<T, N extends number, U = T>(items: Tuple<T, N>, mapper: (t: T) => U = identity): Tuple<U, N> {
  return items.map(mapper) as Tuple<U, N>;
}

export function aggregate<T, K extends string, V = T[]>(
  items: T[],
  by: (item: T) => K = identity,
  aggregator: (aggregated: T[]) => V = identity,
): Record<K, V> {
  return mapValues(
    items.reduce(
      (acc, item) => ({ ...acc, [by(item)]: [...(acc[by(item)] ?? []), item] }),
      {} as Record<K, T[]>,
    ),
    aggregator,
  );
}

export function zip<A, B>(a: A[], b: B[]): ReadonlyArray<[A, B]> {
  if (a.length !== b.length) {
    throw new Error(`Expected arrays to be of equal length. ${a.length} !== ${b.length}`);
  }

  return a.map((t, i) => [t, b[i]]);
}

export function merge<A extends object, B extends object>(a: A[], b: B[]): ReadonlyArray<A & B> {
  return zip(a, b).map(([l, r]) => ({ ...l, ...r }));
}

export function occurrences<T>(
  items: T[],
  by: (item: T) => string = identity,
): Record<string, number> {
  return aggregate(items, by, ({ length }) => length);
}

export function select<T>(items: [], selector: (a: T, b: T) => T): undefined;
export function select<T>(items: [T, ...T[]], selector: (a: T, b: T) => T): Definitely<T>;
export function select<T>(items: T[], selector: (a: T, b: T) => T): Maybe<T>;
export function select<T>(items: T[], selector: (a: T, b: T) => T): Maybe<T> {
  // Avoid: TypeError: Reduce of empty array with no initial value
  return items.reduce((most, item) => selector(most, item), items[0]);
}

export function minBy<T, V extends Natural>(values: [], by?: (item: T) => V): undefined;
export function minBy<T, V extends Natural>(values: [T, ...T[]], by?: (item: T) => V): Definitely<T>;
export function minBy<T, V extends Natural>(values: T[], by?: (item: T) => V): Maybe<T>;
export function minBy<T, V extends Natural>(values: T[], by: (item: T) => V = identity): Maybe<T> {
  return select(values, (a, b) => (by(b) < by(a) ? b : a));
}

export function maxBy<T, V extends Natural>(values: [], by?: (item: T) => V): undefined;
export function maxBy<T, V extends Natural>(values: [T, ...T[]], by?: (item: T) => V): Definitely<T>;
export function maxBy<T, V extends Natural>(values: T[], by?: (item: T) => V): Maybe<T>;
export function maxBy<T, V extends Natural>(values: T[], by: (item: T) => V = identity): Maybe<T> {
  return select(values, (a, b) => (by(b) > by(a) ? b : a));
}

export function extentBy<T, V extends Natural>(values: [], by?: (item: T) => V): undefined;
export function extentBy<T, V extends Natural>(values: [T, ...T[]], by?: (item: T) => V): Definitely<[T, T]>;
export function extentBy<T, V extends Natural>(values: T[], by?: (item: T) => V): Maybe<[T, T]>;
export function extentBy<T, V extends Natural>(values: T[], by: (item: T) => V = identity): Maybe<[T, T]> {
  return values.reduce(([lo, hi], item) => [by(item) < by(lo) ? item : lo, by(item) > by(hi) ? item : hi], [values[0], values[0]]);
}

export function count<T>(items: T[], when: (item: T) => boolean): number {
  return items.reduce((total, item) => total + +when(item), 0);
}

// eslint-disable-next-line @typescript-eslint/ban-types
export function memoize<T extends Function>(f: T, mem = new Map<string, unknown>()): T {
  return ((...args: unknown[]) => {
    const k = JSON.stringify(args);
    return (mem.has(k) || mem.set(k, f(...args))) && mem.get(k);
  }) as unknown as T;
}
