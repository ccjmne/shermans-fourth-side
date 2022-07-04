import { Circle, Line, Segment, type Point } from 'geometries/module';
import { circle, line, point, type Shape } from 'shapes/module';
import { type Maybe } from 'utils/maybe';
import { minBy } from 'utils/utils';

export function selectClosest(shapes: Shape[], from: Point, distanceThreshold: number) {
  return minBy(
    shapes
      .map(shape => ({ shape, closestPoint: shape.geometry.closestPointTo(from) }))
      .filter(({ closestPoint }) => closestPoint.distance < distanceThreshold),
    ({ shape: { priority }, closestPoint: { distance } }) => priority + distance,
  );
}

function computeSnaps(A: Point, B: Point): Shape[] {
  const { length, midpoint, vector: { perpendicular: perp } } = new Segment(A, B);
  return [
    line(Line.fromPoints(A, B), { name: 'Degenerate' }),
    line(new Line(perp, A), { name: 'Right' }),
    line(new Line(perp, B), { name: 'Right' }),
    line(new Line(perp, midpoint), { name: 'Isosceles' }),
    circle(new Circle(midpoint, length / 2), { name: 'Right' }),
    circle(new Circle(A, length), { name: 'Isosceles' }),
    circle(new Circle(B, length), { name: 'Isosceles' }),
    new Circle(A, length).intersectWith(new Line(perp, midpoint)).map(p => point(p, { name: 'Equilateral' })),
    new Circle(midpoint, length / 2).intersectWith(new Line(perp, midpoint)).map(p => point(p, { name: 'Isosceles right' })),
    [A, B].map(vertex => new Circle(vertex, length).intersectWith(new Line(perp, vertex)).map(p => point(p, { name: 'Isosceles right' }))),
  ].flat(2);
}

export function attemptSnapping(from: Point, [A, B]: [Point, Point], distanceThreshold: number): { snappedTo: Maybe<Shape>, at: Point } {
  const closest = selectClosest(computeSnaps(A, B), from, distanceThreshold);
  return { snappedTo: closest?.shape, at: closest?.closestPoint ?? from };
}
