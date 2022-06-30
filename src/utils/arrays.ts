export function pairs<T>(items: T[]): Array<[T, T]> {
  const pairings = [...items.slice(1), items[0]];
  return items.map((item, i) => [item, pairings[i]]);
}

export function triads<T>(items: T[]): Array<[T, T, T]> {
  const one = [...items.slice(-1), ...items.slice(0, items.length - 1)];
  const three = [...items.slice(1), items[0]];
  return items.map((item, i) => [one[i], item, three[i]]);
}

export function sortBy<T, V extends number>(items: T[], by: (item: T) => V, order: 'asc' | 'desc' = 'asc'): T[] {
  return [...items].sort((a, b) => (order === 'asc' ? by(a) - by(b) : by(b) - by(a)));
}

export function minBy<T, V extends number>(items: T[], by: (item: T) => V): T {
  return items.slice(1).reduce((min, item) => (by(item) < by(min) ? item : min), items[0]);
}

export function maxBy<T, V extends number>(items: T[], by: (item: T) => V): T {
  return items.slice(1).reduce((max, item) => (by(item) > by(max) ? item : max), items[0]);
}
