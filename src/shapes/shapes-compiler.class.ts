import { Circle, Point, Vector, type Angle, type Line } from 'geometries/module';
import { sortBy } from 'utils/arrays';
import { isLessThan, isNearly } from 'utils/compare';
import { Scale } from 'utils/scale.class';
import { UnreachableCaseError } from 'utils/unreachable-case-error.class';

import { type Mark } from './mark.class';
import { ShapeType, type Shape } from './shape.class';

const CLOSE_DISTANCE_THRESHOLD_PX = 10;
const ANGLE_RADIUS_PX = 20;
const TEXT_PADDING_PX = 5;

export type MarkAttrs = Partial<{ href: string, transform: string, name: string }>; // TODO: name?? maybe compute that one from its `Shape`'s name + its mark index?
export type PathAttrs = Partial<{ d: string, class: string, name: string }>;
export type TextPathAttrs = { d: string, dy: number, 'dominant-baseline': string, clip: string };

function markAttrs(transform: string, kind: string): MarkAttrs {
  return { transform, href: `#mark:${kind}` };
}

function pathAttrs(d: string, { type, name }: Shape): PathAttrs {
  return { d, class: type, name };
}

function textPathAttrs(d: string, clip: string, above = true): TextPathAttrs {
  return { d, 'dominant-baseline': above ? 'ideographic' : 'hanging', 'dy': above ? -TEXT_PADDING_PX : TEXT_PADDING_PX, clip };
}

export class ShapesCompiler {

  public readonly distanceThreshold: number;
  public readonly Ω: { x: number, y: number };

  private readonly λ: Scale;
  private readonly λy: Scale;
  private readonly circumcircle: Circle;

  constructor({ width, height }: { width: number, height: number }) {
    const Λ = Math.min(width, height) / 2;
    this.Ω = { x: width / 2, y: height / 2 };
    this.λ = new Scale([-Λ, Λ], [-1, 1]);
    this.λy = new Scale([-Λ, Λ], [1, -1]);
    this.circumcircle = new Circle(new Point(0, 0), this.λ.local(Math.sqrt(width ** 2 + height ** 2)) / 2);
    this.distanceThreshold = this.λ.local(CLOSE_DISTANCE_THRESHOLD_PX);
  }

  // TODO: perhaps also take its corresponding `Shape`?
  public getMarkAttrs({ kind, at, rotate }: Mark): MarkAttrs {
    return markAttrs(`translate(${this.screen(at)}) rotate(${rotate * (-180 / Math.PI)})`, kind);
  }

  public getPathAttrs(shape: Shape): PathAttrs {
    switch (shape.type) {
    case ShapeType.POINT:
    case ShapeType.VERTEX:
      return pathAttrs(this.pointPath(shape.geometry), shape);
    case ShapeType.SIDE:
      return pathAttrs(this.linePath([shape.geometry.from, shape.geometry.to]), shape);
    case ShapeType.LINE:
      return pathAttrs(this.linePath(this.circumcircle.intersectWith(shape.geometry)), shape);
    case ShapeType.CIRCLE:
      return pathAttrs(this.circlePath(shape.geometry), shape);
    case ShapeType.ANGLE:
      return pathAttrs(this.anglePath(shape.geometry, this.λ.local(ANGLE_RADIUS_PX * 2)), shape);
    }

    throw new UnreachableCaseError(shape);
  }

  public getTextPathAttrs(shape: Shape, towards: Point, measurements: { fontSize: number, textLength: number }): TextPathAttrs {
    switch (shape.type) {
    case ShapeType.POINT:
    case ShapeType.VERTEX:
      return this.pointTextPath(shape.geometry, measurements);
    case ShapeType.SIDE:
    case ShapeType.LINE:
      return this.lineTextPath(shape.geometry, towards, measurements);
    case ShapeType.CIRCLE:
      return this.circleTextPath(shape.geometry, towards, measurements);
    case ShapeType.ANGLE:
      return this.circleTextPath(new Circle(shape.geometry.B, this.λ.local(ANGLE_RADIUS_PX * 2)), towards, measurements);
    }

    throw new UnreachableCaseError(shape);
  }

  public toLocalCoords({ clientX, clientY }: PointerEvent): Point {
    return new Point(this.λ.local(clientX - this.Ω.x), this.λy.local(clientY - this.Ω.y));
  }

  private screen({ x, y }: Point): string {
    return `${this.λ.screen(x)}, ${this.λy.screen(y)}`;
  }

  private linePath(points: Point[], closed = false): string {
    return `M${points.map(p => this.screen(p)).join('L')}${closed ? 'z' : ''}`;
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
    const λr = this.λ.screen(r);

    return `M${this.screen(from)}
      A${λr},${λr} 0 ${1} ${+sweep} ${this.screen(to)}
      A${λr},${λr} 0 ${1} ${+sweep} ${this.screen(from)}z`;
  }

  private pointPath(point: Point): string {
    return `M${this.screen(point)} m-5,-5 l10,10 m-10,0 l10,-10`;
  }

  /**
   * Compiles either a right-angle mark (for PI/2 angles) or an arc
   */
  private anglePath(angle: Angle, r: number): string {
    const { B: { x, y }, BA, BC } = angle;
    const [toA, toC] = [BA, BC].map(vector => vector.resize(angle.isNearlyRight() ? r * (Math.SQRT2 / 2) : r));
    const from = new Point(x + toA.Δx, y + toA.Δy);
    const to = new Point(x + toC.Δx, y + toC.Δy);
    const λr = this.λ.screen(r);

    if (angle.isNearlyRight()) {
      return this.linePath([from, new Point(x + (toA.Δx + toC.Δx), y + (toA.Δy + toC.Δy)), to]);
    }

    return `M${this.screen(from)}
      A${λr},${λr} 0 ${0} ${+angle.isClockwise()} ${this.screen(to)}`;
  }

  /**
   * Compiles `textPath` for text that follows a line.
   *
   * Always has the text sit on the upper side, or to the right when following a vertical line.
   */
  private lineTextPath(line: Line, at: Point, { fontSize, textLength }: { fontSize: number, textLength: number }): TextPathAttrs {
    const p = line.closestPointTo(at);
    const length = this.λ.local(textLength + 2 * TEXT_PADDING_PX);
    const height = this.λ.local(fontSize + 2 * TEXT_PADDING_PX);
    const [A, B] = new Circle(p, length / 2).intersectWith(line);
    const { Δx, Δy } = line.vector.perpendicular.resize(height);
    const upside = isLessThan(Δy, 0) // always towards positive y-values, or positive x-values if Δy is naught (vertical line)
      ? new Vector(-Δx, -Δy)
      : new Vector(isNearly(Δy, 0) ? Math.abs(Δx) : Δx, Δy);

    return textPathAttrs(
      this.linePath(sortBy([A, B], ({ x }) => x)),
      this.linePath([A, B, B.translate(upside), A.translate(upside)], true),
    );
  }

  /**
   * Compiles `textPath` for text skirting  a circle.
   *
   * Always has the text right side up, either above or below the circle, depending on proximity from the supplied `at` point.
   */
  private circleTextPath(circle: Circle, at: Point, { fontSize, textLength }: { fontSize: number, textLength: number }): TextPathAttrs {
    const { r, O } = circle;
    const above = at.y >= O.y;
    const length = this.λ.local(textLength + 2 * TEXT_PADDING_PX);
    const height = this.λ.local(fontSize + 2 * TEXT_PADDING_PX);

    const θ = length / r; // θ / 2π = length / 2πr
    const angleAt = Math.atan2(at.y - O.y, at.x - O.x);
    const [from, to] = [θ / 2, -θ / 2].map(angle => O.translate(Vector.fromAngle(angleAt + angle).resize(r)));
    const [from2, to2] = [from, to].map(point => point.translate(Vector.fromPoints(O, point).resize(height)));

    const [λr, λr2] = [this.λ.screen(r), this.λ.screen(r + height)];
    const clip = `M${this.screen(from)}
      A${λr},${λr} 0 ${+(θ > Math.PI)} ${+true} ${this.screen(to)}
      L${this.screen(to2)}
      A${λr2},${λr2} 0 ${+(θ > Math.PI)} ${+false} ${this.screen(from2)}
      L${this.screen(from)}z`;

    return textPathAttrs(
      this.circlePath(circle, above, Vector.fromPoints(O, at).angle),
      clip,
      above,
    );
  }

  /**
   * Compiles `textPath` for text linked to a single point.
   *
   * Always has the text splayed id in a wide arc, slightly above the supplied `at` point.
   */
  private pointTextPath(at: Point, { fontSize, textLength }: { fontSize: number, textLength: number }): TextPathAttrs {
    return this.circleTextPath(
      new Circle(at.translate(new Vector(0, -this.λ.local(70))), this.λ.local(80)),
      at.translate(new Vector(0, 1)), // always upward
      { fontSize, textLength },
    );
  }

}
