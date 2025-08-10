import { BonusOptimizer } from "../src/optimization/BonusOptimizer";
import { NetworkSimulator } from "../src/simulation/NetworkSimulator";

describe("BonusOptimizer", () => {
  let optimizer: BonusOptimizer;

  beforeEach(() => {
    optimizer = new BonusOptimizer(new NetworkSimulator());
  });

  test("returns 0 when zero bonus already achieves target within days", () => {
    // adoptionProb that yields high probability at 0
    const adoptionProb = (_bonus: number) => 1.0;
    const result = optimizer.minBonusForTarget(5, 100, adoptionProb, 0.01);
    expect(result).toBe(0);
  });

  test("returns null when target exceeds absolute maximum possible referrals", () => {
    const adoptionProb = (_bonus: number) => 1.0;
    // 100 initial referrers * 10 capacity = 1000 max
    const result = optimizer.minBonusForTarget(100, 1001, adoptionProb, 0.01);
    expect(result).toBeNull();
  });

  test("returns null when even with prob=1 daysToTarget exceeds days", () => {
    const adoptionProb = (_bonus: number) => 0.9;
    // Need 1000 within 5 days: impossible even at prob=1 (would need 200/day but capacity reduces), but daysToTarget(1,1000)=10
    const result = optimizer.minBonusForTarget(5, 1000, adoptionProb, 0.01);
    expect(result).toBeNull();
  });

  test("rounds up to nearest $10", () => {
    // Linear monotonic adoption function where mid bonus suffices
    const adoptionProb = (b: number) => Math.min(1, b / 100);
    const result = optimizer.minBonusForTarget(2, 150, adoptionProb, 0.1);
    // Rough expectation: need prob such that 2 days cumulative >=150 with 100 active and minimal decay
    // Our simulator uses expected daily referrals = activeReferrers * p, with expected capacity reduction.
    // We just validate rounding behavior; exact numeric may vary, so assert it is multiple of 10
    expect(result).not.toBeNull();
    expect((result as number) % 10).toBe(0);
  });

  test("handles small eps and converges", () => {
    const adoptionProb = (b: number) => Math.min(1, 0.002 * b); // 0 at 0, reaches 1 around 500
    const result = optimizer.minBonusForTarget(10, 300, adoptionProb, 1e-6);
    expect(result).not.toBeNull();
  });

  test("supports logarithmic monotone adoption function", () => {
    const adoptionProb = (b: number) =>
      Math.min(1, Math.log1p(Math.max(0, b)) / 10);
    const result = optimizer.minBonusForTarget(7, 250, adoptionProb, 0.001);
    expect(result).not.toBeNull();
    expect((result as number) % 10).toBe(0);
  });

  test("supports sigmoid-like monotone adoption function", () => {
    const adoptionProb = (b: number) => {
      const x = (b - 50) / 20;
      const p = 1 / (1 + Math.exp(-x));
      return Math.min(1, Math.max(0, p));
    };
    const result = optimizer.minBonusForTarget(8, 300, adoptionProb, 0.001);
    expect(result).not.toBeNull();
    expect((result as number) % 10).toBe(0);
  });

  test("respects eps precision (smaller eps should not increase result beyond one rounding increment)", () => {
    const adoptionProb = (b: number) => Math.min(1, b / 400);
    const r1 = optimizer.minBonusForTarget(10, 250, adoptionProb, 1);
    const r2 = optimizer.minBonusForTarget(10, 250, adoptionProb, 1e-6);
    expect(r1).not.toBeNull();
    expect(r2).not.toBeNull();
    // Both are rounded up to nearest 10; tighter eps should yield same rounded or lower pre-rounded high, but after rounding they should be equal
    expect(r2).toBe(r1);
  });
});
