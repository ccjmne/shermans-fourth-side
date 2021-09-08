export type Point = { x: number; y: number };
export type Segment = [Point, Point];
export type Line = { A: number, B: number, C: number }; // "Standard form", such that Ax + By + C = 0
export type Circle = { u: number, v: number, r: number }; // such that (x - i) ** 2 + (y - j) ** 2 = r ** 2

// such as ax^2 + bx + c = 0
function roots(a: number, b: number, c: number): number[] {
  const Δ = b ** 2 - 4 * a * c;
  if (Δ < 0) {
    return [];
  }

  if (Δ === 0) {
    return [-b / (2 * a)];
  }

  return [(-b + Math.sqrt(Δ)) / (2 * a), (-b - Math.sqrt(Δ)) / (2 * a)];
}

export function distance({ x, y }: Point, { x: x2, y: y2 }: Point): number {
  return Math.sqrt((x2 - x) ** 2 + (y2 - y) ** 2);
}

export function slope([{ x, y }, { x: x2, y: y2 }]: Segment): number {
  return (y2 - y) / (x2 - x);
}

export function perpendicular(segment: Segment): number {
  return -1 / slope(segment); // perpendicular slope: negative reciprocal of the original
}

export function isVertical({ B }: Line): boolean {
  return B === 0;
}

export function midpoint([{ x, y }, { x: x2, y: y2 }]: Segment): Point {
  return { x: (x + x2) / 2, y: (y + y2) / 2 };
}

export function slopeThroughPoint(m: number, { x, y }: Point): Line {
  if (Infinity === Math.abs(m)) {
    return { A: 1, B: 0, C: -x };
  }

  return { A: -m, B: 1, C: m * x - y };
}

export function asLine([A, B]: Segment): Line {
  return slopeThroughPoint(slope([A, B]), A);
}

export function intersection({ A, B, C }: Line, { A: A2, B: B2, C: C2 }: Line): Point {
  // Solve the following system of equation:
  // Ax + By + C = A2x + B2y + C2
  // Ax + By + C = 0
  return { x: (B * C2 - B2 * C) / (A * B2 - A2 * B), y: (A * C2 - A2 * C) / (A2 * B - A * B2) };
}

export function intersections({ A, B, C }: Line, { u, v, r }: Circle): Point[] {
  // Solve the following system of equations:
  // Ax + By + C = O
  // (x - i)^2 + (y - j)^2 = r^2
  return A === 0
    ? roots(1, -2 * u, (C / B) * (C / B + 2 * v) + v ** 2 - r ** 2).map((x: number): Point => ({ x, y: -C / B }))
    : roots((1 + (B / A) ** 2), ((2 * B) * (A * u + C)) / A ** 2 - 2 * v, (C * (2 * A * u + C)) / (A ** 2) + u ** 2 + v ** 2 - r ** 2)
      .map((y: number): Point => ({ x: -(B * y + C) / A, y }));
}

export function projection(point: Point, segment: Segment): Point {
  return intersection(asLine(segment), slopeThroughPoint(perpendicular(segment), point));
}

export function bisector(segment: Segment): Line {
  return slopeThroughPoint(perpendicular(segment), midpoint(segment));
}

export function angleBisector([[A, B], [, C]]: [Segment, Segment]): Line {
  function angle([{ x, y }, { x: x2, y: y2 }]: Segment): number {
    return Math.atan2(y2 - y, x2 - x);
  }

  return slopeThroughPoint(Math.tan((angle([B, A]) + angle([B, C])) / 2), B);
}
