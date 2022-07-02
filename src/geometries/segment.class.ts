import { minBy } from 'utils/utils';

import { Line } from './line.class';
import { type ClosestPoint, type Geometry } from './module';
import { Point } from './point.class';
import { Vector } from './vector.class';

export class Segment extends Line implements Geometry {

  constructor(public readonly from: Point, public readonly to: Point) {
    super(Vector.fromPoints(from, to), from);
  }

  public get length(): number {
    return this.from.distanceFrom(this.to);
  }

  public get midpoint(): Point {
    const [{ x, y }, { x: x2, y: y2 }] = [this.from, this.to];
    return new Point((x + x2) / 2, (y + y2) / 2);
  }

  public extend(): Line {
    return Line.fromPoints(this.from, this.to);
  }

  public bisector(): Line {
    return new Line(this.vector.perpendicular, this.midpoint);
  }

  // TODO: maybe the implementation can be somewhat simpler?
  // Consider https://www.ronja-tutorials.com/post/034-2d-sdf-basics/#rectangle perhaps.
  public closestPointTo(point: Point): ClosestPoint {
    const projection = super.closestPointTo(point);
    if ([this.from, this.to].some(p => p.distanceFrom(projection) > this.length)) {
      return minBy([this.from.closestPointTo(point), this.to.closestPointTo(point)], ({ distance }) => distance);
    }

    return projection;
  }

}
