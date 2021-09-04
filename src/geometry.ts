export type Point = { x: number; y: number };
export type Segment = [Point, Point];
export type Line = { offset: number; slope: number };

export function intersection({ offset: o1, slope: s1 }: Line, { offset: o2, slope: s2 }: Line): Point {
  // o1 + x * s1 = o2 + x * s2
  // x * s1 = o2 - o1 + x * s2
  // x * s1 - x * s2 = o2 - o1
  // x * (s1 - s2) = o2 - o1
  const x = (o2 - o1) / (s1 - s2);
  return { x, y: o1 + s1 * x };
}

export function throughPointWithSlope({ x, y }: Point, slope: number): Line {
  return { offset: y - slope * x, slope };
}

export function distance({ x: x1, y: y1 }: Point, { x: x2, y: y2 }: Point): number {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

export function length(AB: Segment): number {
  return distance(...AB);
}

export function asLine([{ x: x1, y: y1 }, { x: x2, y: y2 }]: Segment): Line {
  return throughPointWithSlope({ x: x1, y: y1 }, (y2 - y1) / (x2 - x1));
}
