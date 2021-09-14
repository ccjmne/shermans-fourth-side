/* eslint-disable @typescript-eslint/no-non-null-assertion *//*

  This file makes assertions about Maybe types based on geometric definitions.
  For instance, two lines that are known to not by parallel *must* have an intersection
*/

/* eslint-disable no-use-before-define */
/* eslint-disable max-classes-per-file */

import { minBy } from './arrays';
import { Maybe } from './maybe';

// TODO: maybe split all that stuff across multiple files?

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

export class Slope extends Number {

  constructor(public readonly rise: number, public readonly run: number) {
    super(rise / run);
  }

  static fromAngle(angle: number): Slope {
    return new Slope(Math.sin(angle), Math.cos(angle));
  }

  public static fromPoints(from: Point, to: Point): Slope {
    const [{ x, y }, { x: x2, y: y2 }] = [from, to];
    return new Slope(y2 - y, x2 - x);
  }

  public get perpendicular(): Slope {
    return new Slope(-this.run, this.rise);
  }

  public get angle(): number {
    return Math.atan2(this.rise, this.run);
  }

  public isVertical(): boolean {
    return this.run === 0;
  }

  public isParallelTo(other: Slope): boolean {
    return +this === +other || (this.isVertical() && other.isVertical());
  }

}

export interface Geometry {
  closestPointTo(point: Point): ClosestPoint;
}

export type ClosestPoint = Point & { distance: number };

export class Point implements Geometry {

  constructor(public readonly x: number, public readonly y: number) {}

  public distanceFrom({ x, y }: Point): number {
    return Math.sqrt((x - this.x) ** 2 + (y - this.y) ** 2);
  }

  public closestPointTo(point: Point): ClosestPoint {
    return Object.assign(this, { distance: this.distanceFrom(point) });
  }

  public projectOnto(line: Line): Point {
    return line.intersectWith(new Line(line.slope.perpendicular, this))!; // always intersects, by geometric definition
  }

}

// Described internally such as `Ax + By + C = 0`.
export class Line implements Geometry {

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

export class Segment extends Line implements Geometry {

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

export class Circle implements Geometry {

  constructor(public readonly O: Point, public readonly r: number) { }

  public closestPointTo(point: Point): ClosestPoint {
    return minBy(this.intersectWith(Line.fromPoints(this.O, point)).map(p => p.closestPointTo(point)), ({ distance }) => distance)!; // always intersections, by geometric definition
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
    return A === 0
      // different, simpler equation if A is naught
      // ? roots(1, -2 * u, (C / B) * (C / B + 2 * v) + v ** 2 - r ** 2).map(x => new Point(x, -C / B))
      // Further simplifying, for in that case B is 1, **by implementation**
      ? roots(1, -2 * u, C * (C + 2 * v) + v ** 2 - r ** 2).map(x => new Point(x, -C))
      : roots(1 + (B / A) ** 2, ((2 * B) * (A * u + C)) / A ** 2 - 2 * v, (C * (2 * A * u + C)) / A ** 2 + u ** 2 + v ** 2 - r ** 2)
        .map(y => new Point(-(B * y + C) / A, y));
  }

}

export class Angle {

  constructor(public readonly A: Point, public readonly B: Point, public readonly C: Point) {}

  public bisector(external = false): Line {
    const { A, B, C } = this;
    const slope = Slope.fromAngle((Slope.fromPoints(B, A).angle + Slope.fromPoints(B, C).angle) / 2);
    return new Line(external ? slope.perpendicular : slope, B);
  }

}
