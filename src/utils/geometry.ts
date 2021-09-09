/* eslint-disable max-classes-per-file */

import { minIndex } from 'd3-array';

// TODO: maybe split all that stuff across multiple files?

export function pairs<T>(items: T[]): Array<[T, T]> {
  const pairings = [...items.slice(1), items[0]];
  return items.map((item, i) => [item, pairings[i]]);
}

export function triads<T>(items: T[]): Array<[T, T, T]> {
  const second = [...items.slice(1), items[0]];
  const third = [...second.slice(1), second[0]];
  return items.map((item, i) => [item, second[i], third[i]]);
}

export function minBy<T, U extends number>(items: Array<T>, by: (item: T) => U): T {
  return items[minIndex(items, by)];
}

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

  constructor(value: number) {
    // slopes of `-Infinity` as coerced to positive-`Infinity` ones for simplicity.
    super(Math.abs(value) === Infinity ? Infinity : value);
  }

  public static fromRiseOverRun(rise: number, run: number): Slope {
    return new Slope(rise / run);
  }

  public get perpendicular(): Slope {
    return new Slope(-1 / this.valueOf()); // negative reciprocal is perpendicular
  }

  public isVertical(): boolean {
    return this.valueOf() === Infinity;
  }

  public isParallelTo(other: Slope): boolean {
    return this === other;
  }

}

export interface GeometricShape {
  closestFrom(point: Point): Point & { distance: number };
}

export class Point implements GeometricShape {

  constructor(public readonly x: number, public readonly y: number) {}

  public distanceFrom({ x, y }: Point): number {
    return Math.sqrt((x - this.x) ** 2 + (y - this.y) ** 2);
  }

  public closestFrom(point: Point): Point & { distance: number } {
    return Object.assign(this, { distance: this.distanceFrom(point) });
  }

  public projectOnto(line: Line): Point {
    // never `null`
    return line.intersectWith(new Line(line.slope.perpendicular, this));
  }

}

// Described internally such as `Ax + By + C = 0`.
export class Line implements GeometricShape {

  public readonly A: number;
  public readonly B: number;
  public readonly C: number;

  constructor(slope: Slope, { x, y }: Point) {
    [this.A, this.B, this.C] = slope.isVertical() ? [1, 0, -x] : [-slope, 1, slope.valueOf() * x - y];
  }

  public static fromPoints(A: Point, B: Point): Line {
    return new Segment(A, B).asLine();
  }

  public get slope(): Slope {
    return new Slope(this.isVertical() ? Infinity : -this.A);
  }

  public isVertical(): boolean {
    return this.B === 0;
  }

  public closestFrom(point: Point): Point & { distance: number } {
    return point.projectOnto(this).closestFrom(point);
  }

  /**
  * No intersection iff parallel to `this`.
  */
  public intersectWith({ A: A2, B: B2, C: C2, slope }: Line): Point | null {
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

export class Segment extends Array<Point> implements GeometricShape {

  constructor(public readonly A: Point, public readonly B: Point) {
    super(A, B);
  }

  public get slope(): Slope {
    const [{ x, y }, { x: x2, y: y2 }] = [this.A, this.B];
    return Slope.fromRiseOverRun(y2 - y, x2 - x);
  }

  public get measure(): number {
    return this.A.distanceFrom(this.B);
  }

  public get midpoint(): Point {
    const [{ x, y }, { x: x2, y: y2 }] = [this.A, this.B];
    return new Point((x + x2) / 2, (y + y2) / 2);
  }

  public get bisector(): Line {
    return new Line(this.slope.perpendicular, this.midpoint);
  }

  public asLine(): Line {
    return new Line(this.slope, this.A);
  }

  // TODO: maybe the implementation can be somewhat simpler?
  // Consider https://www.ronja-tutorials.com/post/034-2d-sdf-basics/#rectangle perhaps.
  public closestFrom(point: Point): Point & { distance: number } {
    const projection = this.asLine().closestFrom(point);
    if ([this.A, this.B].some(p => p.distanceFrom(projection) > this.measure)) {
      return minBy([this.A.closestFrom(projection), this.B.closestFrom(projection)], ({ distance }) => distance);
    }

    return projection;
  }

}

export class Circle extends Point implements GeometricShape {

  constructor(public readonly O: Point, public readonly r: number) {
    super(O.x, O.y);
  }

  // TODO: maybe the implementation can be somewhat of an algebraically simpler formulae?
  closestFrom(point: Point): Point & { distance: number } {
    return minBy(this.intersectWith(Line.fromPoints(this.O, point)).map(p => p.closestFrom(point)), ({ distance }) => distance);
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
    return A === 0 // different, simpler equation if A is naught (then B is 1 by implementation)
      // ? roots(1, -2 * u, (C / B) * (C / B + 2 * v) + v ** 2 - r ** 2).map(x => new Point(x, -C / B))
      ? roots(1, -2 * u, C * (C + 2 * v) + v ** 2 - r ** 2).map(x => new Point(x, -C))
      : roots(1 + (B / A) ** 2, ((2 * B) * (A * u + C)) / A ** 2 - 2 * v, (C * (2 * A * u + C)) / A ** 2 + u ** 2 + v ** 2 - r ** 2)
        .map(y => new Point(-(B * y + C) / A, y));
  }

}

export class Angle {

  constructor(public readonly A: Point, public readonly B: Point, public readonly C: Point) {}

  public get bisector(): Line {
    const { A, B, C } = this;
    return new Line(new Slope(Math.tan((Angle.atan2(B, A) + Angle.atan2(B, C)) / 2)), B);
  }

  private static atan2({ x, y }: Point, { x: x2, y: y2 }: Point): number {
    return Math.atan2(y2 - y, x2 - x);
  }

}
