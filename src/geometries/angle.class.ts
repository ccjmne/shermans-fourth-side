import { Line, Point, Slope } from './module';

export default class Angle {

  constructor(public readonly A: Point, public readonly B: Point, public readonly C: Point) {}

  public bisector(external = false): Line {
    const { A, B, C } = this;
    const slope = Slope.fromAngle((Slope.fromPoints(B, A).angle + Slope.fromPoints(B, C).angle) / 2);
    return new Line(external ? slope.perpendicular : slope, B);
  }

}
