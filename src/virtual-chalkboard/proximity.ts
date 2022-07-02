import { Circle, Line, Point, Segment } from 'geometries/module';
import { circle, line, point, Shape } from 'shapes/module';
import { Maybe } from 'utils/maybe';
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
    line(Line.fromPoints(A, B), { name: 'Flat triangle' }),
    line(new Line(perp, A), { name: 'Right-angle triangle' }),
    line(new Line(perp, B), { name: 'Right-angle triangle' }),
    line(new Line(perp, midpoint), { name: 'Isoceles triangle' }),
    circle(new Circle(midpoint, length / 2), { name: 'Right-angle triangle' }),
    circle(new Circle(A, length), { name: 'Isoceles triangle' }),
    circle(new Circle(B, length), { name: 'Isoceles triangle' }),
    new Circle(A, length).intersectWith(new Line(perp, midpoint))
      .map(p => point(p, { name: 'Equirectangular triangle' })),
    new Circle(midpoint, length / 2).intersectWith(new Line(perp, midpoint))
      .map(p => point(p, { name: 'Isoceles right-angle triangle' })),
    ...[A, B].map(v => new Circle(v, length).intersectWith(new Line(perp, v))
      .map(p => point(p, { name: 'Isoceles right-angle triangle' }))),
  ].flat();
}

export function attemptSnapping(from: Point, [A, B]: [Point, Point], distanceThreshold: number): { snappedTo: Maybe<Shape>, at: Point } {
  const closest = selectClosest(computeSnaps(A, B), from, distanceThreshold);
  return { snappedTo: closest?.shape, at: closest?.closestPoint ?? from };
}
