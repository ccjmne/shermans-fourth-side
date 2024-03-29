import { isNearly } from 'utils/compare';
import { minBy, type Tuple } from 'utils/utils';

import { Line } from './line.class';
import { type ClosestPoint, type Geometry } from './module';
import { Point } from './point.class';

/**
 * Finds the 0, 1 or 2 roots of the quadratic equations described through the three factors `a`, `b` and `c` such that:
 * ```
 * ax^2 + bx + c = 0
 * ```
 */
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

export class Circle implements Geometry {

  constructor(public readonly O: Point, public readonly r: number) { }

  public closestPointTo(point: Point): ClosestPoint {
    return minBy(
      this.intersectWith(Line.fromPoints(this.O, point)).map(p => p.closestPointTo(point)) as Tuple<ClosestPoint, 2>, // these intersections must exist, by geometric definition
      ({ distance }) => distance,
    );
  }

  /**
   * Either 0, 1 or 2 intersections.
   */
  public intersectWith(line: Line): Point[] {
    // Solve the following system of equations:
    // Ax + By + C = O
    // (x - u)^2 + (y - v)^2 = r^2
    const { A, B, C } = line;
    const { O: { x: u, y: v }, r } = this;
    return isNearly(A, 0)
      // different, simpler equation if A is naught
      // ? roots(1, -2 * u, (C / B) * (C / B + 2 * v) + u ** 2 + v ** 2 - r ** 2).map(x => new Point(x, -C / B))
      ? roots(1, -2 * u, C * (C + 2 * v) + u ** 2 + v ** 2 - r ** 2).map(x => new Point(x, -C)) // Further simplifying, for in that case B is 1, **by implementation**
      : roots(1 + (B / A) ** 2, ((2 * B) * (A * u + C)) / A ** 2 - 2 * v, (C * (2 * A * u + C)) / A ** 2 + u ** 2 + v ** 2 - r ** 2)
        .map(y => new Point(-(B * y + C) / A, y));
  }

}
