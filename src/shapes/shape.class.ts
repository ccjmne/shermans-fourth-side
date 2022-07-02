import { Angle, Segment, type Circle, type Geometry, type Line, type Point } from 'geometries/module';
import { type Maybe } from 'utils/maybe';

import { Mark } from './mark.class';

export enum ShapeType { VERTEX = 'vertex', POINT = 'point', SIDE = 'side', LINE = 'line', CIRCLE = 'circle', ANGLE = 'angle' }
export type Priority = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
export type IDVertex = 'A' | 'B' | 'C';
type ShapeAttrs<ID extends Maybe<string> = null>
  = { name: string, parents?: Shape[], marks?: Mark[] } & (ID extends string ? { id: ID } : { id?: ID });

export type ShapeVertex = ShapeImpl<ShapeType.VERTEX, Point, IDVertex>;
export type ShapeSide = ShapeImpl<ShapeType.SIDE, Segment, string>;
export type ShapeAngle = ShapeImpl<ShapeType.ANGLE, Angle, string>;
export type ShapeLine = ShapeImpl<ShapeType.LINE, Line>;
export type ShapeCircle = ShapeImpl<ShapeType.CIRCLE, Circle>;

export type Shape = ShapeVertex | ShapeSide | ShapeLine | ShapeCircle | ShapeAngle | ShapeImpl<ShapeType.POINT, Point>;

class ShapeImpl<T extends ShapeType, G extends Geometry, ID extends Maybe<string> = null> {

  public readonly priority: Priority;

  /**
   * Used for highlighting hovered shape and snapping to most remarkable point
   */
  private static readonly PRIORITIES: { [key in ShapeType]?: Priority } = {
    [ShapeType.VERTEX]: 0,
    [ShapeType.POINT]: 0,
    [ShapeType.SIDE]: 1,
  };

  constructor(
    public readonly type: T,
    public readonly geometry: G,
    public readonly id: ID,
    public readonly name: string,
    public readonly parents: Shape[] = [],
    public readonly marks: Mark[] = [],
  ) {
    this.priority = ShapeImpl.PRIORITIES[type] ?? 9;
  }

  /**
   * @deprecated
   * TODO: maybe remove?
   */
  public reshape(geometry: G): ShapeImpl<T, G, ID> {
    return new ShapeImpl(this.type, geometry, this.id, this.name, this.parents, this.marks);
  }

}

export function identify({ name }: Shape): string {
  return name;
}

export function isVertex(s: Maybe<Shape>): s is ShapeVertex {
  return s?.type === ShapeType.VERTEX;
}

export function vertex(geometry: Point, { name, id, parents, marks }: ShapeAttrs<IDVertex>): ShapeVertex {
  return new ShapeImpl(ShapeType.VERTEX, geometry, id, name, parents, marks);
}

export function point(geometry: Point, { name, parents, marks }: ShapeAttrs): Shape {
  return new ShapeImpl(ShapeType.POINT, geometry, null, name, parents, marks);
}

export function side(from: ShapeVertex, to: ShapeVertex): ShapeSide {
  return new ShapeImpl(
    ShapeType.SIDE,
    new Segment(from.geometry, to.geometry),
    `${from.id}${to.id}`,
    `Side ${from.id}${to.id}`,
    [from, to],
  );
}

export function line(geometry: Line, { name, parents, marks }: ShapeAttrs): ShapeLine {
  return new ShapeImpl(ShapeType.LINE, geometry, null, name, parents, marks);
}

export function circle(geometry: Circle, { name, parents, marks }: ShapeAttrs): ShapeCircle {
  return new ShapeImpl(ShapeType.CIRCLE, geometry, null, name, parents, marks);
}

export function angle(geometry: Angle, { name, id, parents, marks }: ShapeAttrs<string>): ShapeAngle {
  return new ShapeImpl(ShapeType.ANGLE, geometry, id, name, parents, marks);
}

export function bisector(of: ShapeSide): ShapeLine {
  const { from, midpoint, to, vector: { angle: θ } } = of.geometry;

  return new ShapeImpl(
    ShapeType.LINE,
    of.geometry.bisector(),
    null,
    `Perpendicular bisector of ${of.id}`,
    [of],
    [
      new Mark('tick-double', new Segment(from, midpoint).midpoint, θ),
      new Mark('tick-double', new Segment(midpoint, to).midpoint, θ),
      new Mark('right-angle', midpoint, θ),
    ],
  );
}

export function angularBisector(of: ShapeAngle): ShapeLine {
  const { geometry: { A, B, C }, parents } = of;
  const bisect = of.geometry.bisector();

  return new ShapeImpl(
    ShapeType.LINE,
    bisect,
    null,
    `Bisector of ${of.id}`,
    [of, ...parents],
    of.geometry.isNearlyRight() ? [
      new Mark('right-angle-tick', B, bisect.vector.angle),
    ] : [
      new Mark('angle-tick', B, new Angle(A, B, B.translate(bisect.vector)).bisector().vector.angle - Math.PI / 2),
      new Mark('angle-tick', B, new Angle(B.translate(bisect.vector), B, C).bisector().vector.angle - Math.PI / 2),
    ],
  );
}
