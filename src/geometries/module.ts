import Angle from './angle.class';
import Circle from './circle.class';
import Line from './line.class';
import Point from './point.class';
import Segment from './segment.class';
import Vector from './vector.class';

export { Angle, Circle, Line, Point, Segment, Vector };
export type ClosestPoint = Point & { distance: number };
export interface Geometry {
  closestPointTo(point: Point): ClosestPoint;
}
