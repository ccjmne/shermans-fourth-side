export class Scale {

  private readonly offset0: number;
  private readonly offset1: number;
  private readonly scale: number;

  /**
   * Performs mapping from the specified domain of values to the given range (unbounded).
   * @param domain Domain of screen coordinates
   * @param range Range of local system coordinates corresponding to the mapped domain
   */
  constructor([lo, hi]: [number, number], [lo1, hi1]: [number, number]) {
    this.offset0 = lo;
    this.offset1 = lo1;
    this.scale = (hi1 - lo1) / (hi - lo);
  }

  /**
   * Offsets and scales the given value in screen coordinates to the local system
   */
  public local(n: number): number {
    return (n - this.offset0) * this.scale + this.offset1;
  }

  /**
   * Offsets and scales the given value in the local system to screen coordinates
   */
  public screen(n: number): number {
    return (n - this.offset1) / this.scale + this.offset0;
  }

}
