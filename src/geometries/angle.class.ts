import { isGreaterThan, isNearly, εθ } from 'utils/compare';

import { Line } from './line.class';
import { type ClosestPoint, type Geometry, type Point } from './module';
import { Vector } from './vector.class';

/**
 * The angle ∠ABC, around B
 */
export class Angle implements Geometry {

  public readonly BA: Vector;
  public readonly BC: Vector;

  constructor(public readonly A: Point, public readonly B: Point, public readonly C: Point) {
    this.BA = Vector.fromPoints(B, A);
    this.BC = Vector.fromPoints(B, C);
  }

  public get angle(): number {
    return Math.atan2(this.BA.cross(this.BC), this.BA.dot(this.BC));
  }

  public isClockwise(): boolean {
    return this.BA.cross(this.BC) < 0;
  }

  public bisector(external = false): Line {
    const vector = Vector.fromAngle(this.BA.angle + this.angle / 2);
    return new Line(external ? vector.perpendicular : vector, this.B);
  }

  public isNearlyRight(): boolean {
    return isNearly(Math.abs(this.angle), Math.PI / 2, εθ);
  }

  public isNearlyStraight(): boolean {
    return isNearly(Math.abs(this.angle), Math.PI, εθ);
  }

  public isObtuse(): boolean {
    return isGreaterThan(Math.abs(this.angle), Math.PI / 2, εθ);
  }

  public closestPointTo(point: Point): ClosestPoint {
    // TODO: actually implement, maybe?
    return this.B.closestPointTo(point);
  }

}
