import { Circle, Line, Point, Segment } from '../geometries/module';
import { Maybe } from '../utils/maybe';

import Shape from './shape.class';
import ShapesCompiler from './shapes-compiler.class';

export { ShapesCompiler };

export enum ShapeTypeOption { VERTEX='vertex', POINT='point', SIDE='side', LINE='line', CIRCLE='circle' }
export type ShapeTypePriority = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
export type ShapeVertex = Shape<ShapeTypeOption.VERTEX, Point>;
export type ShapeType = ShapeVertex
  | Shape<ShapeTypeOption.POINT, Point>
  | Shape<ShapeTypeOption.SIDE, Segment>
  | Shape<ShapeTypeOption.LINE, Line>
  | Shape<ShapeTypeOption.CIRCLE, Circle>;

export default class Shapes {

  private static readonly PRIORITIES: {[key in ShapeTypeOption]?: ShapeTypePriority } = {
    [ShapeTypeOption.VERTEX]: 0,
    [ShapeTypeOption.POINT]: 1,
  };

  public static vertex(point: Point, name: string): ShapeVertex {
    return new Shape(ShapeTypeOption.VERTEX, point, name);
  }

  public static point(point: Point, name: string): Shape<ShapeTypeOption.POINT, Point> {
    return new Shape(ShapeTypeOption.POINT, point, name);
  }

  public static side(segment: Segment, name: string): Shape<ShapeTypeOption.SIDE, Segment> {
    return new Shape(ShapeTypeOption.SIDE, segment, name);
  }

  public static line(line: Line, name: string): Shape<ShapeTypeOption.LINE, Line> {
    return new Shape(ShapeTypeOption.LINE, line, name);
  }

  public static circle(circle: Circle, name: string): Shape<ShapeTypeOption.CIRCLE, Circle> {
    return new Shape(ShapeTypeOption.CIRCLE, circle, name);
  }

  public static priority({ type }: ShapeType): ShapeTypePriority {
    return Shapes.PRIORITIES[type] ?? 9;
  }

  // TODO: maybe deprecate/don't use this?
  public static identify({ name }: ShapeType): string {
    return name;
  }

  public static isVertex(shape: Maybe<ShapeType>): shape is ShapeVertex {
    return shape?.type === ShapeTypeOption.VERTEX;
  }

}
