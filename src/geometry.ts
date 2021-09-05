export type Point = { x: number; y: number };
export type Segment = [Point, Point];
export type Line = { offset: number; slope: number };

export function intersection({ offset: o, slope: s }: Line, { offset: o2, slope: s2 }: Line): Point {
  // o + x * s = o2 + x * s2
  // x * s = o2 - o + x * s2
  // x * s - x * s2 = o2 - o
  // x * (s - s2) = o2 - o
  const x = (o2 - o) / (s - s2);
  return { x, y: o + s * x };
}

export function slopeThroughPoint(slope: number, { x, y }: Point): Line {
  return { offset: y - slope * x, slope };
}

export function distance({ x, y }: Point, { x: x2, y: y2 }: Point): number {
  return Math.sqrt((x2 - x) ** 2 + (y2 - y) ** 2);
}

export function length([A, B]: Segment): number {
  return distance(A, B);
}

export function asLine([{ x, y }, { x: x2, y: y2 }]: Segment): Line {
  return slopeThroughPoint((y2 - y) / (x2 - x), { x, y });
}

// perpendicular slope: negative reciprocal of the original
export function perpendicular(slope: number): number;
export function perpendicular(segment: Segment): number;
export function perpendicular(line: Line): number;
export function perpendicular(to: number | Segment | Line): number {
  return -1 / (function originalSlope() {
    if (typeof to === 'number') {
      return to;
    }

    if (Array.isArray(to)) {
      return asLine(to).slope;
    }

    return to.slope;
  }());
}

export function bisector([{ x, y }, { x: x2, y: y2 }]: Segment): Line {
  // point: midpoint through which to go
  return slopeThroughPoint(perpendicular((y2 - y) / (x2 - x)), { x: (x + x2) / 2, y: (y + y2) / 2 });
}

export function angleBisector([[A, B], [, C]]: [Segment, Segment]): Line {
  function angle([{ x, y }, { x: x2, y: y2 }]: Segment): number {
    return Math.atan2(y2 - y, x2 - x);
  }

  return slopeThroughPoint(Math.tan((angle([B, A]) + angle([B, C])) / 2), B);
}
