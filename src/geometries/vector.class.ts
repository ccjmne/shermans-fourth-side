import { Point } from './module';

export default class Vector {

  public readonly slope: number;

  constructor(public readonly Δx: number, public readonly Δy: number) {
    this.slope = Δy / Δx;
  }

  public static fromPoints({ x, y }: Point, { x: x2, y: y2 }: Point): Vector {
    return new Vector(x2 - x, y2 - y);
  }

  public static fromAngle(θ: number): Vector {
    return new Vector(Math.cos(θ), Math.sin(θ));
  }

  public get perpendicular(): Vector {
    return new Vector(this.Δy, -this.Δx);
  }

  public get angle(): number {
    return Math.atan2(this.Δy, this.Δx);
  }

  public magnitude(m: number): Vector {
    const λ = Math.sqrt(this.Δx ** 2 + this.Δy ** 2) / m;
    return new Vector(this.Δx / λ, this.Δy / λ);
  }

  public dot({ Δx, Δy }: Vector): number {
    return this.Δx * Δx + this.Δy * Δy;
  }

  public cross(other: Vector): number {
    return this.dot(other.perpendicular);
  }

  public isVertical(): boolean {
    return this.Δx === 0;
  }

  public isParallelTo(other: Vector): boolean {
    return this.slope === other.slope || (this.isVertical() && other.isVertical());
  }

}
