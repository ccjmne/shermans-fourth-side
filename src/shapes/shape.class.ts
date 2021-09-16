/* eslint-disable max-classes-per-file */

import { Geometry, Line, Point, Segment } from '../geometries/module';

import { ShapeType, ShapeTypeOption } from './module';

// TODO: NO MORE THAN ONE CLASS PER FILE!!! or maybe not really, depending on how large these get 🤔

/**
 * the `Mark`s have a `kind` that will refer to a `path` SVG Element in `defs` to be linked to through `<use href=...>`
 *
 * Please note it's `href=`, and not `xlink:href`. See https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/xlink:href
 *
 * `xlink:href` is both deprecated and obsoleted... as soon™ as SVG2 comes out.
 */
export class Mark {

  public constructor(
    public readonly kind: 'tick' | 'angle',
    public readonly at: Point,
    public readonly rotate: number,
  ) {}

}

export default class Shape<T extends ShapeTypeOption, S extends Geometry> {

    public readonly linked: ShapeType[] = [];
    public readonly marks: Mark[] = [];

    constructor(
          public readonly type: T,
          public readonly geometry: S,
          public readonly name: string,
    ) {}

    public reshape(geometry: S): Shape<T, S> {
      return new Shape(this.type, geometry, this.name);
    }

    public link(...shapes: ShapeType[]): void {
      this.linked.push(...shapes);
    }

}

export class SideShape extends Shape<ShapeTypeOption.SIDE, Segment> {

  constructor(geometry: Segment, name: string) {
    super(ShapeTypeOption.SIDE, geometry, name);
  }

}

export class BisectorShape extends Shape<ShapeTypeOption.LINE, Line> {

  constructor(side: SideShape) {
    super(ShapeTypeOption.LINE, side.geometry.bisector(), `Perpendicular bisector of ${side.name}`);
    this.link(side);

    const { from, midpoint, to } = side.geometry;

    this.marks.push(
      new Mark('tick', new Segment(from, midpoint).midpoint, -side.geometry.vector.angle),
      new Mark('tick', new Segment(midpoint, to).midpoint, -side.geometry.vector.angle),
    );
  }

}
