import { Maybe } from '../utils/maybe';

import { ClosestPoint, Geometry, Point, Slope } from './module';

// Described internally such as `Ax + By + C = 0`.
export default class Line implements Geometry {

  public readonly A: number;
  public readonly B: number;
  public readonly C: number;

  constructor(public readonly slope: Slope, { x, y }: Point) {
    [this.A, this.B, this.C] = slope.isVertical() ? [1, 0, -x] : [-slope, 1, +slope * x - y];
  }

  public static fromPoints(from: Point, to: Point): Line {
    return new Line(Slope.fromPoints(from, to), from);
  }

  public closestPointTo(point: Point): ClosestPoint {
    return point.projectOnto(this).closestPointTo(point);
  }

  /**
    * No intersection iff parallel to `this`.
    */
  public intersectWith({ A: A2, B: B2, C: C2, slope }: Line): Maybe<Point> {
    if (this.slope.isParallelTo(slope)) {
      return null;
    }

    // Solve the following system of equation:
    // Ax + By + C = A2x + B2y + C2
    // Ax + By + C = 0
    const { A, B, C } = this;
    return new Point((B * C2 - B2 * C) / (A * B2 - A2 * B), (A * C2 - A2 * C) / (A2 * B - A * B2));
  }

}
