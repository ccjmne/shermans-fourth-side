import { Point } from 'geometries/module';

/**
 * the `Mark`s have a `kind` that will refer to a `path` SVG Element in `defs` to be linked to through `<use href=...>`
 *
 * Please note it's `href=`, and not `xlink:href`. See https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/xlink:href
 *
 * `xlink:href` is both deprecated and obsoleted... as soon™ as SVG2 comes out.
 */
export class Mark {

  public constructor(
    public readonly kind: 'tick' | 'tick-double' | 'right-angle' | 'x' | 'angle-tick' | 'right-angle-tick',
    public readonly at: Point,
    public readonly rotate: number,
  ) {}

}
