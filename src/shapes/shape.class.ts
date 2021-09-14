import { Geometry } from '../geometries/module';

import { ShapeTypeOption } from './module';

export default class Shape<T extends ShapeTypeOption, S extends Geometry> {

  constructor(
    public readonly type: T,
    public readonly geometry: S,
    public readonly name: string,
  ) {}

  public reshape(geometry: S): Shape<T, S> {
    return new Shape(this.type, geometry, this.name);
  }

}
