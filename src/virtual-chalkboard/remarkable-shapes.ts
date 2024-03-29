import { Circle, Segment } from 'geometries/module';
import { angularBisector, bisector, circle, line, point, type Shape } from 'shapes/module';
import { pairs } from 'utils/arrays';
import { forSure } from 'utils/maybe';
import { maxBy } from 'utils/utils';

import { Triangle } from './proximity';

export function remarkableShapes({ vertices, sides, angles }: Triangle): Shape[] {
  const triangle = [vertices, sides, angles];
  const lines = [
    sides.map(bisector),
    angles.map(angularBisector),
    angles.map(θ => line(θ.geometry.bisector(true), { name: `External bisector of ${θ.id}` })),
    sides.map(s => line(s.geometry.extend(), { name: `${s.name} (extended)`, parents: [s] })),
  ];

  const largestAngle = maxBy(angles, ({ geometry: { angle } }) => Math.abs(angle)).geometry;
  const enclosingCentre = new Segment(largestAngle.A, largestAngle.C).midpoint;
  const obtuseEnclosing = circle(new Circle(enclosingCentre, enclosingCentre.distanceFrom(largestAngle.A)), {
    name: 'Smallest circle enclosing ABC',
    parents: sides,
  });

  if (largestAngle.isNearlyStraight()) {
    // If the triangle is flat, only the smallest enclosing circle exists
    return [triangle, lines, obtuseEnclosing].flat(2);
  }

  const [bisectors, angularBisectors, externalAngularBisectors, extendedSides] = lines;
  const [
    [{ geometry: A }],
    [{ geometry: AB }],
    [{ geometry: b1 }, { geometry: b2 }],
    [{ geometry: ngb1 }, { geometry: nbg2 }],
  ] = [vertices, sides, bisectors, angularBisectors];

  // these intersections can't be `null`, by geometric definition
  const [circumcentre, incentre] = [forSure(b1.intersectWith(b2)), forSure(ngb1.intersectWith(nbg2))];
  const circles = [
    largestAngle.isObtuse() ? obtuseEnclosing : circle(
      new Circle(circumcentre, circumcentre.distanceFrom(A)),
      { name: 'Smallest circle enclosing ABC', parents: sides },
    ),
    pairs(externalAngularBisectors)
      .map(([engb1, engb2], i) => ({
        parents: [engb1, engb2, forSure(angularBisectors.at(i - 1))],
        excentre: forSure(engb1.geometry.intersectWith(engb2.geometry)), // this intersection can not be `null`, by geometric definition
      }))
      .flatMap(({ excentre, parents }, i) => [
        point(excentre, { name: `Excentre opposite ${forSure(vertices.at(i - 1)).id}`, parents, marks: parents.flatMap(({ marks }) => marks) }),
        circle(new Circle(excentre, sides[i].geometry.closestPointTo(excentre).distance), {
          name: `Excircle tangent to ${sides[i].id}`,
          parents: [sides[i], ...extendedSides.filter(s => !s.parents.includes(sides[i]))],
        }),
      ]),
    circle(new Circle(circumcentre, circumcentre.distanceFrom(A)), { name: 'Circumcircle of ABC', parents: sides }),
    circle(new Circle(incentre, AB.closestPointTo(incentre).distance), { name: 'Incircle of ABC', parents: sides }),
    point(circumcentre, { name: 'Cirumcentre', parents: bisectors, marks: bisectors.flatMap(({ marks }) => marks) }),
    point(incentre, { name: 'Incentre', parents: [...angularBisectors, ...angles], marks: angularBisectors.flatMap(({ marks }) => marks) }),
  ];

  return [triangle, lines, circles].flat(2);
}
