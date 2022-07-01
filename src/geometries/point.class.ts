import { type ClosestPoint, type Geometry } from './module';
import { Vector } from './vector.class';

export class Point implements Geometry {

  constructor(public readonly x: number, public readonly y: number) {}

  public translate({ Δx, Δy }: Vector): Point {
    return new Point(this.x + Δx, this.y + Δy);
  }

  public distanceFrom({ x, y }: Point): number {
    return Math.sqrt((x - this.x) ** 2 + (y - this.y) ** 2);
  }

  public closestPointTo(point: Point): ClosestPoint {
    return Object.assign(this, { distance: this.distanceFrom(point) });
  }

}
