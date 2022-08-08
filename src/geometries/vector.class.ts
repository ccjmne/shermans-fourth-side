import { isNearly, εθ } from 'utils/compare';

import { type Point } from './point.class';

export class Vector {

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

  public get magnitude(): number {
    return Math.sqrt(this.Δx ** 2 + this.Δy ** 2);
  }

  public get perpendicular(): Vector {
    return new Vector(this.Δy, -this.Δx);
  }

  public get angle(): number {
    return Math.atan2(this.Δy, this.Δx);
  }

  public resize(m: number): Vector {
    // If `this.magnitude` is naught, resizing shall yield another (0, 0) Vector.
    const λ = m / (this.magnitude || 1);
    return new Vector(this.Δx * λ, this.Δy * λ);
  }

  public rotate(θ: number): Vector {
    return Vector.fromAngle(this.angle + θ).resize(this.magnitude);
  }

  public dot({ Δx, Δy }: Vector): number {
    return this.Δx * Δx + this.Δy * Δy;
  }

  public cross(other: Vector): number {
    return this.dot(other.perpendicular);
  }

  public isVertical(): boolean {
    return isNearly(this.Δx, 0);
  }

  public isParallelTo(other: Vector): boolean {
    return isNearly(this.angle, other.angle, εθ);
  }

}
