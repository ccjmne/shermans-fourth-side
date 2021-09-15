import { ClosestPoint, Geometry, Line } from './module';

export default class Point implements Geometry {

  constructor(public readonly x: number, public readonly y: number) {}

  public distanceFrom({ x, y }: Point): number {
    return Math.sqrt((x - this.x) ** 2 + (y - this.y) ** 2);
  }

  public closestPointTo(point: Point): ClosestPoint {
    return Object.assign(this, { distance: this.distanceFrom(point) });
  }

  public projectOnto(line: Line): Point {
    return line.intersectWith(new Line(line.vector.perpendicular, this)) as Point; // always intersects, by geometric definition
  }

}
