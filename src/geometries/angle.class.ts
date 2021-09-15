import { εθ } from '../utils/limits';

import { ClosestPoint, Geometry, Line, Point, Vector } from './module';

/**
 * The angle ∠ABC, around B
 */
export default class Angle implements Geometry {

  public readonly BA: Vector;
  public readonly BC: Vector;

  private readonly AC: Vector;

  constructor(public readonly A: Point, public readonly B: Point, public readonly C: Point) {
    this.BA = Vector.fromPoints(B, A);
    this.BC = Vector.fromPoints(B, C);
    this.AC = Vector.fromPoints(A, C);
  }

  public isClockwise(): boolean {
    return this.BA.cross(this.BC) < 0;
  }

  public bisector(external = false): Line {
    const vector = Vector.fromAngle((this.BA.angle + this.BC.angle) / 2);
    return new Line(external ? vector.perpendicular : vector, this.B);
  }

  /**
   * True iff within `Math.PI / 120` radians (1.5 degrees) of a pure straight angle.
   */
  public isNearlyRight(): boolean {
    // TODO: maybe just do "perfect" computation, when snapping will be implemented
    // return this.BA.cross(this.BC) === 0;
    return Math.abs(this.BA.angle - this.BC.angle) % (Math.PI / 2) < (εθ / 2);
  }

  /**
   * True iff within `Math.PI / 60` radians (3 degrees) of a pure straight angle.
   */
  public isNearlyStraight(): boolean {
    return Math.abs(this.AC.angle - this.BC.angle) < εθ;
  }

  public closestPointTo(point: Point): ClosestPoint {
    // TODO: actually implement
    return this.B.closestPointTo(point);
  }

}
