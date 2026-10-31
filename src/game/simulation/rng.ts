/**
 * Deterministic Seeded Random Number Generator (Mulberry32 / LCG hybrid)
 * Ensures identical state + seed + elapsed time produces identical simulation results.
 */
export class SeededRandom {
  private state: number;

  constructor(seed: number) {
    this.state = (seed >>> 0) || 123456789;
  }

  public getState(): number {
    return this.state >>> 0;
  }

  public setState(seed: number): void {
    this.state = (seed >>> 0) || 123456789;
  }

  /**
   * Returns a deterministic float in [0, 1)
   */
  public next(): number {
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    this.state = t >>> 0;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /**
   * Returns a float in [min, max)
   */
  public range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  /**
   * Returns an integer in [min, max] inclusive
   */
  public int(min: number, max: number): number {
    return Math.floor(this.range(min, max + 1));
  }

  /**
   * Returns true with probability p (0..1)
   */
  public chance(p: number): boolean {
    if (p <= 0) return false;
    if (p >= 1) return true;
    return this.next() < p;
  }

  /**
   * Picks a random element from a non-empty array
   */
  public pick<T>(arr: readonly T[]): T {
    return arr[Math.floor(this.next() * arr.length)];
  }
}

