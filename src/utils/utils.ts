import { Definitely, isNotNil, Maybe } from './maybe';

type TupleRec<T, N extends number, R extends unknown[]> = R['length'] extends N ? R : TupleRec<T, N, [T, ...R]>;
export type Tuple<T, N extends number> = N extends N ? number extends N ? T[] : { length: N } & TupleRec<T, N, []> : never;

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

export function zip<T>(a: T[], b: T[]): ReadonlyArray<[T, T]> {
  if (a.length !== b.length) {
    throw new Error(`Expected arrays to be of equal length. ${a.length} !== ${b.length}`);
  }

  return a.map((t, i) => [t, b[i]]);
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

export function minBy<T, V>(values: [], by: (item: T) => V): undefined;
export function minBy<T, V>(values: [T, ...T[]], by: (item: T) => V): Definitely<T>;
export function minBy<T, V>(values: T[], by: (item: T) => V): Maybe<T>;
export function minBy<T, V>(values: T[], by: (item: T) => V = identity): Maybe<T> {
  return select(values, (a, b) => (by(b) < by(a) ? b : a));
}

export function maxBy<T, V>(values: [], by: (item: T) => V): undefined;
export function maxBy<T, V>(values: [T, ...T[]], by: (item: T) => V): Definitely<T>;
export function maxBy<T, V>(values: T[], by: (item: T) => V): Maybe<T>;
export function maxBy<T, V>(values: T[], by: (item: T) => V = identity): Maybe<T> {
  return select(values, (a, b) => (by(b) > by(a) ? b : a));
}

export function count<T>(items: T[], when: (item: T) => boolean): number {
  return items.reduce((total, item) => total + +when(item), 0);
}

export function mapFind<T, R>(items: T[], map: (t: T) => R, find: (r: R) => boolean = isNotNil): Maybe<R> {
  return items.reduce((r, t) => r ?? (rt => (find(rt) ? rt : null))(map(t)), null as Maybe<R>);
}

// eslint-disable-next-line @typescript-eslint/ban-types
export function memoize<T extends Function>(f: T, mem = new Map()): T {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  return ((...args: unknown[]) => (k => (mem.has(k) || mem.set(k, f(...args))) && mem.get(k))(JSON.stringify(args))) as unknown as T;
}

/* eslint-disable max-len */
export const Styles = Object.freeze({ BLACK: 1, RED: 2, GREEN: 4, YELLOW: 8, BLUE: 16, MAGENTA: 32, CYAN: 64, WHITE: 128, RESET: 256, BRIGHT: 512, DIM: 1024, UNDERSCORE: 2048, BLINK: 4096, REVERSE: 8192, HIDDEN: 16384 });
const STYLES_MAP = { [Styles.BLACK]: '\x1b[30m', [Styles.RED]: '\x1b[31m', [Styles.GREEN]: '\x1b[32m', [Styles.YELLOW]: '\x1b[33m', [Styles.BLUE]: '\x1b[34m', [Styles.MAGENTA]: '\x1b[35m', [Styles.CYAN]: '\x1b[36m', [Styles.WHITE]: '\x1b[37m', [Styles.RESET]: '\x1b[0m', [Styles.BRIGHT]: '\x1b[1m', [Styles.DIM]: '\x1b[2m', [Styles.UNDERSCORE]: '\x1b[4m', [Styles.BLINK]: '\x1b[5m', [Styles.REVERSE]: '\x1b[7m', [Styles.HIDDEN]: '\x1b[8m' };
/* eslint-enable max-len */

/**
 * @param { string } text
 * @param { number } styles A combination of flags from `Styles`. For example:
 * ```
 * Styles.BRIGHT | Styles.UNDERSCORE
 * ```
 * @returns { string }
 */
export function style(text: string, styles: number): string {
  return Object.entries(STYLES_MAP)
    .filter(([flag]) => !!(styles & +flag)) // eslint-disable-line no-bitwise
    .map(([, esc]) => esc)
    .join('')
    + text
    + STYLES_MAP[Styles.RESET];
}
