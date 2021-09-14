import { Point } from './module';

export default class Slope extends Number {

  constructor(public readonly rise: number, public readonly run: number) {
    super(rise / run);
  }

  static fromAngle(angle: number): Slope {
    return new Slope(Math.sin(angle), Math.cos(angle));
  }

  public static fromPoints(from: Point, to: Point): Slope {
    const [{ x, y }, { x: x2, y: y2 }] = [from, to];
    return new Slope(y2 - y, x2 - x);
  }

  public get perpendicular(): Slope {
    return new Slope(-this.run, this.rise);
  }

  public get angle(): number {
    return Math.atan2(this.rise, this.run);
  }

  public isVertical(): boolean {
    return this.run === 0;
  }

  public isParallelTo(other: Slope): boolean {
    return +this === +other || (this.isVertical() && other.isVertical());
  }

}
