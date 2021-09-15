import { minBy } from '../utils/arrays';

import { ClosestPoint, Geometry, Line, Point, Slope } from './module';

export default class Segment extends Line implements Geometry {

  constructor(public readonly from: Point, public readonly to: Point) {
    super(Slope.fromPoints(from, to), from);
  }

  public get length(): number {
    return this.from.distanceFrom(this.to);
  }

  public get midpoint(): Point {
    const [{ x, y }, { x: x2, y: y2 }] = [this.from, this.to];
    return new Point((x + x2) / 2, (y + y2) / 2);
  }

  public bisector(): Line {
    return new Line(this.slope.perpendicular, this.midpoint);
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