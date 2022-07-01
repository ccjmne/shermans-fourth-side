import { type Maybe } from '../utils/maybe';

import { type ClosestPoint, type Geometry } from './module';
import { Point } from './point.class';
import { Vector } from './vector.class';

// Described internally such as `Ax + By + C = 0`.
export class Line implements Geometry {

  public readonly A: number;
  public readonly B: number;
  public readonly C: number;

  constructor(public readonly vector: Vector, { x, y }: Point) {
    [this.A, this.B, this.C] = vector.isVertical() ? [1, 0, -x] : [-vector.slope, 1, vector.slope * x - y];
  }

  // Can't use `Segment#new` here 'cause then we'd have a `Segment` rather than a `Line`, with a different `closestPointTo`, for instance...
  public static fromPoints(from: Point, to: Point): Line {
    return new Line(Vector.fromPoints(from, to), from);
  }

  public closestPointTo(point: Point): ClosestPoint {
    // always intersects, by geometric definition
    return (this.intersectWith(new Line(this.vector.perpendicular, point)) as Point).closestPointTo(point);
  }

  /**
    * No intersection iff parallel to `this`.
    */
  public intersectWith({ A: A2, B: B2, C: C2, vector }: Line): Maybe<Point> {
    if (this.vector.isParallelTo(vector)) {
      return null;
    }

    // Solve the following system of equation:
    // Ax + By + C = A2x + B2y + C2
    // Ax + By + C = 0
    const { A, B, C } = this;
    return new Point((B * C2 - B2 * C) / (A * B2 - A2 * B), (A * C2 - A2 * C) / (A2 * B - A * B2));
  }

}
