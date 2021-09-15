import { scaleLinear, ScaleLinear } from 'd3-scale';

import { Angle, Circle, Line, Point, Vector } from '../geometries/module';
import { sortBy } from '../utils/arrays';
import UnreachableCaseError from '../utils/unreachable-case-error.class';

import { ShapeType, ShapeTypeOption as ShapeTypeName } from './module';

const VERTEX_RADIUS_PX = 20;
const CLOSE_DISTANCE_THRESHOLD_PX = 20;
const TEXT_DY = 5;

export type PathAttrs = Partial<{ d: string, class: string, name: string }>;
export type TextPathAttrs = Partial<{ d: string, dy: number, 'dominant-baseline': string }>;

function pathAttrs(d: string, { type, name }: ShapeType): PathAttrs {
  return { d, class: type, name };
}
function textPathAttrs(d: string, above = true): TextPathAttrs {
  return { d, 'dominant-baseline': above ? 'ideographic' : 'hanging', 'dy': above ? -TEXT_DY : TEXT_DY };
}

export default class ShapesCompiler {

  public readonly distanceThreshold: number;
  public readonly Ω: { x: number, y: number };

  private readonly λ: ScaleLinear<number, number, number>; // scale distances
  private readonly λx: ScaleLinear<number, number, number>; // scale along the x-axis
  private readonly λy: ScaleLinear<number, number, number>; // scale along the y-axis
  private readonly circumcircle: Circle;
  private readonly vertexRadius: number;

  constructor({ width, height }: { width: number, height: number }) {
    const Λ = Math.min(width, height) / 2;
    this.Ω = { x: width / 2, y: height / 2 };
    this.λ = scaleLinear([0, Λ]);
    this.λx = scaleLinear([-Λ, Λ]).domain([-1, 1]);
    this.λy = scaleLinear([-Λ, Λ]).domain([1, -1]);
    this.circumcircle = new Circle(new Point(0, 0), this.λ.invert(Math.sqrt(width ** 2 + height ** 2)) / 2);
    this.vertexRadius = this.λ.invert(VERTEX_RADIUS_PX);
    this.distanceThreshold = this.λ.invert(CLOSE_DISTANCE_THRESHOLD_PX);
  }

  public getPathAttrs(shape: ShapeType): PathAttrs {
    switch (shape.type) {
    case ShapeTypeName.POINT:
    case ShapeTypeName.VERTEX:
      return pathAttrs(this.circlePath(new Circle(shape.geometry, this.vertexRadius)), shape);
    case ShapeTypeName.SIDE:
      return pathAttrs(this.linePath([shape.geometry.from, shape.geometry.to]), shape);
    case ShapeTypeName.LINE:
      return pathAttrs(this.linePath(this.circumcircle.intersectWith(shape.geometry)), shape);
    case ShapeTypeName.CIRCLE:
      return pathAttrs(this.circlePath(shape.geometry), shape);
    case ShapeTypeName.ANGLE:
      return pathAttrs(this.anglePath(shape.geometry, this.λ.invert(VERTEX_RADIUS_PX * 2)), shape);
    }

    throw new UnreachableCaseError(shape);
  }

  public getTextPathAttrs(shape: ShapeType, towards: Point): TextPathAttrs {
    switch (shape.type) {
    case ShapeTypeName.POINT:
    case ShapeTypeName.VERTEX:
      return this.circleTextPath(new Circle(shape.geometry, this.vertexRadius), towards);
    case ShapeTypeName.SIDE:
    case ShapeTypeName.LINE:
      return this.lineTextPath(shape.geometry, towards);
    case ShapeTypeName.CIRCLE:
      return this.circleTextPath(shape.geometry, towards);
    case ShapeTypeName.ANGLE:
      return this.circleTextPath(new Circle(shape.geometry.B, this.λ.invert(VERTEX_RADIUS_PX * 2)), towards);
    }

    throw new UnreachableCaseError(shape);
  }

  public toLocalCoords({ clientX, clientY }: MouseEvent): Point {
    return new Point(this.λx.invert(clientX - this.Ω.x), this.λy.invert(clientY - this.Ω.y));
  }

  private coords({ x, y }: Point): string {
    return `${this.λx(x)},${this.λy(y)}`;
  }

  private linePath(points: Point[]): string {
    return `M${points.map(p => this.coords(p)).join('L')}`;
  }

  /**
   * @param circle the `Circle` whose geometry to draw
   * @param sweep `true` for clockwise
   * @param angle angle at which to draw the text
   */
  private circlePath({ O: { x, y }, r }: Circle, sweep = false, angle = 0): string {
    const Δx = Math.cos(angle);
    const Δy = Math.sin(angle);
    const from = new Point(x - Δx * r, y - Δy * r);
    const to = new Point(x + Δx * r, y + Δy * r);
    const λr = this.λ(r);

    return `M${this.coords(from)}
      A${λr},${λr} 0 ${1} ${+sweep} ${this.coords(to)}
      A${λr},${λr} 0 ${1} ${+sweep} ${this.coords(from)}`;
  }

  private anglePath(angle: Angle, r: number): string {
    const { B: { x, y }, BA, BC } = angle;
    const [toA, toC] = [BA, BC].map(vector => vector.magnitude(angle.isNearlyRight() ? r * (Math.SQRT2 / 2) : r));
    const from = new Point(x + toA.Δx, y + toA.Δy);
    const to = new Point(x + toC.Δx, y + toC.Δy);
    const λr = this.λ(r);

    if (angle.isNearlyRight()) {
      return this.linePath([from, new Point(x + (toA.Δx + toC.Δx), y + (toA.Δy + toC.Δy)), to]);
    }

    return `M${this.coords(from)}
      A${λr},${λr} 0 ${0} ${+angle.isClockwise()} ${this.coords(to)}`;
  }

  private lineTextPath(line: Line, at: Point): TextPathAttrs {
    return textPathAttrs(this.linePath(sortBy(new Circle(at, this.circumcircle.r).intersectWith(line), ({ x }) => x)));
  }

  private circleTextPath(circle: Circle, at: Point): TextPathAttrs {
    const above = at.y >= circle.O.y;
    return textPathAttrs(this.circlePath(circle, above, Vector.fromPoints(circle.O, at).angle), above);
  }

}
