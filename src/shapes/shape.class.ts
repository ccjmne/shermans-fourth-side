import { Angle, Segment, type Circle, type Geometry, type Line, type Point } from '../geometries/module';
import { type Maybe } from '../utils/maybe';

import { Mark } from './mark.class';

export enum ShapeType { VERTEX = 'vertex', POINT = 'point', SIDE = 'side', LINE = 'line', CIRCLE = 'circle', ANGLE = 'angle' }
export type Priority = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
type ShapeAttrs = { name: string, aka?: string, parents?: Shape[], marks?: Mark[] };

export type ShapeVertex = ShapeImpl<ShapeType.VERTEX, Point>;
export type ShapeSide = ShapeImpl<ShapeType.SIDE, Segment>;
export type ShapeLine = ShapeImpl<ShapeType.LINE, Line>;
export type ShapeCircle = ShapeImpl<ShapeType.CIRCLE, Circle>;
export type ShapeAngle = ShapeImpl<ShapeType.ANGLE, Angle>;

export type Shape = ShapeVertex | ShapeSide | ShapeLine | ShapeCircle | ShapeAngle | ShapeImpl<ShapeType.POINT, Point>;

class ShapeImpl<T extends ShapeType, G extends Geometry> {

  public readonly priority: Priority;

  private static readonly PRIORITIES: { [key in ShapeType]?: Priority } = {
    [ShapeType.VERTEX]: 0,
    [ShapeType.POINT]: 0,
    [ShapeType.SIDE]: 1,
  };

  constructor(
    public readonly type: T,
    public readonly geometry: G,
    public readonly name: string,
    public readonly aka: string,
    public readonly parents: Shape[] = [],
    public readonly marks: Mark[] = [],
  ) {
    this.priority = ShapeImpl.PRIORITIES[type] ?? 9;
  }

  public using(geometry: G): ShapeImpl<T, G> {
    return new ShapeImpl(this.type, geometry, this.name, this.aka, this.parents, this.marks);
  }

}

export function identify({ name }: Shape): string {
  return name;
}

export function isVertex(s: Maybe<Shape>): s is ShapeVertex {
  return s?.type === ShapeType.VERTEX;
}

function shape<T extends ShapeType, G extends Geometry>(
  type: T,
  geometry: G,
  { name, aka, parents, marks }: ShapeAttrs,
): ShapeImpl<T, G> {
  return new ShapeImpl(type, geometry, name, aka ?? name, parents, marks);
}

export function vertex(geometry: Point, attrs: ShapeAttrs): ShapeVertex {
  return shape(ShapeType.VERTEX, geometry, attrs);
}

export function point(geometry: Point, attrs: ShapeAttrs): Shape {
  return shape(ShapeType.POINT, geometry, attrs);
}

export function side(from: ShapeVertex, to: ShapeVertex): ShapeSide {
  return shape(ShapeType.SIDE, new Segment(from.geometry, to.geometry), {
    name: `Side ${from.aka}${to.aka}`,
    aka: `${from.aka}${to.aka}`,
    parents: [from, to],
  });
}

export function line(geometry: Line, attrs: ShapeAttrs): ShapeLine {
  return shape(ShapeType.LINE, geometry, attrs);
}

export function circle(geometry: Circle, attrs: ShapeAttrs): ShapeCircle {
  return shape(ShapeType.CIRCLE, geometry, attrs);
}

export function angle(geometry: Angle, attrs: ShapeAttrs): ShapeAngle {
  return shape(ShapeType.ANGLE, geometry, attrs);
}

export function bisector(of: ShapeSide): ShapeLine {
  const { from, midpoint, to, vector: { angle: θ } } = of.geometry;

  return shape(ShapeType.LINE, of.geometry.bisector(), {
    name: `Perpendicular bisector of ${of.aka}`,
    parents: [of],
    marks: [
      new Mark('tick-double', new Segment(from, midpoint).midpoint, θ),
      new Mark('tick-double', new Segment(midpoint, to).midpoint, θ),
      new Mark('right-angle', midpoint, θ),
    ],
  });
}

export function angularBisector(of: ShapeAngle): ShapeLine {
  const { geometry: { A, B, C }, parents } = of;
  const bisect = of.geometry.bisector();

  return shape(ShapeType.LINE, bisect, {
    name: `Bisector of ${of.aka}`,
    parents: [of, ...parents],
    marks: of.geometry.isNearlyRight() ? [
      new Mark('right-angle-tick', B, bisect.vector.angle),
    ] : [
      new Mark('angle-tick', B, new Angle(A, B, B.translate(bisect.vector)).bisector().vector.angle - Math.PI / 2),
      new Mark('angle-tick', B, new Angle(B.translate(bisect.vector), B, C).bisector().vector.angle - Math.PI / 2),
    ],
  });
}
