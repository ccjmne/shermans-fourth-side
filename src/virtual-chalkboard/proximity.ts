import { Angle, Circle, Line, Segment, type Point } from 'geometries/module';
import { circle, line, point, ShapeAngle, ShapeSide, ShapeVertex, type Shape } from 'shapes/module';
import { pairs } from 'utils/arrays';
import { isNearly, εθ } from 'utils/compare';
import { Maybe } from 'utils/maybe';
import { maxBy, minBy, Tuple } from 'utils/utils';

export type Triangle = { vertices: Tuple<ShapeVertex, 3>, sides: Tuple<ShapeSide, 3>, angles: Tuple<ShapeAngle, 3> };
export type Classification = {
  lateral: 'Degenerate' | 'Scalene' | 'Isosceles' | 'Equilateral';
  angular: 'Degenerate' | 'Acute' | 'Right' | 'Obtuse' | 'Equiangular';
};

// Use `Shape`s over plain Geometries so as to leverage the PRIORITY mechanism
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

export function selectClosest(shapes: Shape[], from: Point, distanceThreshold: number): Maybe<{ shape: Shape, closestPoint: Point }> {
  return minBy(
    shapes
      .map(shape => ({ shape, closestPoint: shape.geometry.closestPointTo(from) }))
      .filter(({ closestPoint }) => closestPoint.distance < distanceThreshold),
    ({ shape: { priority }, closestPoint: { distance } }) => priority + distance,
  );
}

export function attemptSnapping(from: Point, [A, B]: [Point, Point], distanceThreshold: number): Point {
  return selectClosest(computeSnaps(A, B), from, distanceThreshold)?.closestPoint ?? from;
}

export function classify({ sides, angles }: Triangle): Classification {
  const largestAngle = maxBy(angles.map(({ geometry }) => geometry) as Tuple<Angle, 3>, ({ angle }) => Math.abs(angle));
  let lateral: Classification['lateral'];
  let angular: Classification['angular'];

  if (largestAngle.isNearlyStraight()) {
    angular = 'Degenerate';
  } else if (largestAngle.isObtuse()) {
    angular = 'Obtuse';
  } else if (largestAngle.isNearlyRight()) {
    angular = 'Right';
  } else if (angles.every(({ geometry: { angle } }) => isNearly(Math.abs(angle), Math.PI / 3, εθ))) {
    angular = 'Equiangular';
  } else {
    angular = 'Acute';
  }

  if (angular === 'Degenerate') {
    lateral = 'Degenerate';
  } else if (angular === 'Equiangular') {
    lateral = 'Equilateral';
  } else if (pairs(sides.map(({ geometry: { length } }) => length)).some(([AB, BC]) => isNearly(AB, BC))) {
    lateral = 'Isosceles';
  } else {
    lateral = 'Scalene';
  }

  return { lateral, angular };
}
