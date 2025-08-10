import { NetworkSimulator } from "../src/simulation/NetworkSimulator";

describe("NetworkSimulator", () => {
  let simulator: NetworkSimulator;

  beforeEach(() => {
    simulator = new NetworkSimulator();
  });

  describe("Initialization", () => {
    test("should initialize with 100 active referrers", () => {
      const initialState = simulator.getInitialState();

      expect(initialState.activeReferrers.size).toBe(100);
      expect(initialState.totalReferrals).toBe(0);
      expect(initialState.day).toBe(0);
    });

    test("should initialize each referrer with capacity of 10", () => {
      const initialState = simulator.getInitialState();

      for (const [referrerId, capacity] of initialState.activeReferrers) {
        expect(capacity).toBe(10);
        expect(referrerId).toMatch(/^referrer_\d+$/);
      }
    });

    test("should have correct static constants", () => {
      expect(NetworkSimulator.getInitialReferrersCount()).toBe(100);
      expect(NetworkSimulator.getReferralCapacity()).toBe(10);
    });
  });

  describe("simulate method", () => {
    test("should return empty array for zero days", () => {
      expect(() => simulator.simulate(0.5, 0)).toThrow("Days must be positive");
    });

    test("should throw error for negative days", () => {
      expect(() => simulator.simulate(0.5, -1)).toThrow(
        "Days must be positive",
      );
    });

    test("should throw error for invalid probability", () => {
      expect(() => simulator.simulate(-0.1, 10)).toThrow(
        "Probability must be between 0 and 1",
      );
      expect(() => simulator.simulate(1.1, 10)).toThrow(
        "Probability must be between 0 and 1",
      );
    });

    test("should return correct array length", () => {
      const result = simulator.simulate(0.5, 10);
      expect(result).toHaveLength(10);
    });

    test("should have cumulative increasing values", () => {
      const result = simulator.simulate(0.5, 10);

      for (let i = 1; i < result.length; i++) {
        expect(result[i]).toBeGreaterThanOrEqual(result[i - 1]);
      }
    });

    test("should calculate expected referrals correctly for probability 1", () => {
      const result = simulator.simulate(1.0, 1);

      // With probability 1, all 100 referrers should make 1 referral on day 1
      expect(result[0]).toBe(100);
    });

    test("should calculate expected referrals correctly for probability 0", () => {
      const result = simulator.simulate(0.0, 5);

      // With probability 0, no referrals should be made
      result.forEach((dayResult) => {
        expect(dayResult).toBe(0);
      });
    });

    test("should handle capacity exhaustion over time", () => {
      const result = simulator.simulate(1.0, 15);

      // With probability 1, referrers should exhaust capacity
      // Day 1: 100 referrers make 100 referrals, each has 9 capacity left
      // Day 2: 100 referrers make 100 referrals, each has 8 capacity left
      // ...
      // Day 10: 100 referrers make 100 referrals, each has 0 capacity left
      // Day 11+: No active referrers, no more referrals

      expect(result[0]).toBe(100); // Day 1
      expect(result[9]).toBe(1000); // Day 10 (cumulative)
      expect(result[10]).toBe(1000); // Day 11 (no new referrals)
      expect(result[14]).toBe(1000); // Day 15 (no new referrals)
    });

    test("should handle partial probability correctly", () => {
      const result = simulator.simulate(0.5, 5);

      // With probability 0.5, expect about 50 referrals per day initially
      expect(result[0]).toBeCloseTo(50, 1);

      // Should be cumulative
      expect(result[1]).toBeGreaterThan(result[0]);
    });
  });

  describe("daysToTarget method", () => {
    test("should return 0 for target of 0 or negative", () => {
      expect(simulator.daysToTarget(0.5, 0)).toBe(0);
      expect(simulator.daysToTarget(0.5, -5)).toBe(0);
    });

    test("should return -1 for probability of 0", () => {
      expect(simulator.daysToTarget(0, 100)).toBe(-1);
    });

    test("should throw error for invalid probability", () => {
      expect(() => simulator.daysToTarget(-0.1, 100)).toThrow(
        "Probability must be between 0 and 1",
      );
      expect(() => simulator.daysToTarget(1.1, 100)).toThrow(
        "Probability must be between 0 and 1",
      );
    });

    test("should return -1 for unachievable target", () => {
      // Maximum possible referrals is 100 referrers * 10 capacity = 1000
      expect(simulator.daysToTarget(1.0, 1001)).toBe(-1);
    });

    test("should calculate correct days for achievable targets", () => {
      // With probability 1, we get 100 referrals per day
      expect(simulator.daysToTarget(1.0, 50)).toBe(1);
      expect(simulator.daysToTarget(1.0, 100)).toBe(1);
      expect(simulator.daysToTarget(1.0, 150)).toBe(2);
      expect(simulator.daysToTarget(1.0, 200)).toBe(2);
    });

    test("should handle maximum capacity scenario", () => {
      // Maximum referrals: 100 referrers * 10 capacity = 1000
      expect(simulator.daysToTarget(1.0, 1000)).toBe(10);
    });

    test("should handle low probability scenarios", () => {
      const days = simulator.daysToTarget(0.1, 50);
      expect(days).toBeGreaterThan(0);
      expect(days).toBeLessThan(1000); // Should be reasonable
    });
  });

  describe("Simulation State Management", () => {
    test("should properly track active referrers", () => {
      const initialState = simulator.getInitialState();
      expect(initialState.activeReferrers.size).toBe(100);

      // All referrers should start with full capacity
      for (const capacity of initialState.activeReferrers.values()) {
        expect(capacity).toBe(10);
      }
    });

    test("should maintain state consistency", () => {
      const result = simulator.simulate(0.3, 20);

      // Results should be non-negative and finite
      result.forEach((value) => {
        expect(value).toBeGreaterThanOrEqual(0);
        expect(Number.isFinite(value)).toBe(true);
      });
    });

    test("should handle edge case of very small probability", () => {
      const result = simulator.simulate(0.001, 10);

      // Should still produce valid results
      expect(result).toHaveLength(10);
      result.forEach((value) => {
        expect(value).toBeGreaterThanOrEqual(0);
        expect(Number.isFinite(value)).toBe(true);
      });
    });

    test("should handle edge case of single day simulation", () => {
      const result = simulator.simulate(0.7, 1);

      expect(result).toHaveLength(1);
      expect(result[0]).toBeCloseTo(70, 1); // 100 referrers * 0.7 probability
    });
  });

  describe("Capacity Tracking and Deactivation", () => {
    test("should deactivate referrers when capacity is exhausted", () => {
      // Simulate with probability 1 for multiple days
      const result = simulator.simulate(1.0, 12);

      // After 10 days, all referrers should be exhausted
      expect(result[9]).toBe(1000); // Day 10: 100 * 10 = 1000 total
      expect(result[10]).toBe(1000); // Day 11: no new referrals
      expect(result[11]).toBe(1000); // Day 12: no new referrals
    });

    test("should gradually reduce active referrers with partial probability", () => {
      // This test verifies that the simulation properly handles capacity reduction
      const result = simulator.simulate(0.5, 25);

      // Should eventually plateau when all referrers are exhausted
      const finalValue = result[result.length - 1];

      // At some point, the growth should slow down significantly
      expect(finalValue).toBeLessThanOrEqual(1000); // Can't exceed max capacity
    });

    test("should handle fractional capacity correctly", () => {
      // Test with probability that creates fractional capacity reductions
      const result = simulator.simulate(0.33, 15);

      // Should produce reasonable results without errors
      expect(result).toHaveLength(15);
      result.forEach((value) => {
        expect(value).toBeGreaterThanOrEqual(0);
        expect(Number.isFinite(value)).toBe(true);
      });
    });
  });

  describe("Mathematical Correctness", () => {
    test("should match expected value calculations", () => {
      // For small number of days with probability 0.5
      const result = simulator.simulate(0.5, 3);

      // Day 1: 100 referrers * 0.5 = 50 expected referrals
      expect(result[0]).toBeCloseTo(50, 1);

      // Day 2: 100 referrers * 0.5 = 50 more expected, cumulative 100
      expect(result[1]).toBeCloseTo(100, 1);

      // Day 3: 100 referrers * 0.5 = 50 more expected, cumulative 150
      expect(result[2]).toBeCloseTo(150, 1);
    });

    test("should handle boundary conditions", () => {
      // Test with probability exactly 1
      const result1 = simulator.simulate(1.0, 5);
      expect(result1[0]).toBe(100);
      expect(result1[4]).toBe(500);

      // Test with probability exactly 0
      const result0 = simulator.simulate(0.0, 5);
      result0.forEach((value) => expect(value).toBe(0));
    });
  });

  describe("Comprehensive Deterministic Scenarios", () => {
    test("should produce exact results for probability 1.0 scenarios", () => {
      const result = simulator.simulate(1.0, 10);

      // With probability 1.0, each day should add exactly the number of active referrers
      // Day 1: 100 referrers make 100 referrals (cumulative: 100)
      expect(result[0]).toBe(100);
      // Day 2: 100 referrers make 100 referrals (cumulative: 200)
      expect(result[1]).toBe(200);
      // Day 10: 100 referrers make 100 referrals (cumulative: 1000)
      expect(result[9]).toBe(1000);
    });

    test("should handle capacity exhaustion deterministically", () => {
      // With probability 1.0, all referrers exhaust capacity after 10 days
      const result = simulator.simulate(1.0, 15);

      // Days 1-10: Linear growth of 100 referrals per day
      for (let day = 0; day < 10; day++) {
        expect(result[day]).toBe((day + 1) * 100);
      }

      // Days 11-15: No new referrals (all referrers exhausted)
      for (let day = 10; day < 15; day++) {
        expect(result[day]).toBe(1000);
      }
    });

    test("should calculate exact expected values for fractional probabilities", () => {
      // Test with probability 0.25 for precise calculations
      const result = simulator.simulate(0.25, 4);

      // Day 1: 100 * 0.25 = 25 expected referrals
      expect(result[0]).toBeCloseTo(25, 10);
      // Day 2: 100 * 0.25 = 25 more, cumulative 50
      expect(result[1]).toBeCloseTo(50, 10);
      // Day 3: 100 * 0.25 = 25 more, cumulative 75
      expect(result[2]).toBeCloseTo(75, 10);
      // Day 4: 100 * 0.25 = 25 more, cumulative 100
      expect(result[3]).toBeCloseTo(100, 10);
    });

    test("should handle capacity reduction with fractional probabilities", () => {
      // Test scenario where capacity reduces gradually
      const result = simulator.simulate(0.1, 50);

      // With low probability, capacity should reduce slowly
      // After 50 days with 0.1 probability, each referrer should have made ~5 referrals on average
      // So they should still have ~5 capacity remaining
      expect(result[49]).toBeCloseTo(500, 50); // Allow some tolerance for floating point
    });

    test("should produce consistent results across multiple runs", () => {
      // Since we're using expected values, results should be deterministic
      const result1 = simulator.simulate(0.3, 20);
      const result2 = simulator.simulate(0.3, 20);

      expect(result1).toEqual(result2);
    });

    test("should handle edge case of very high capacity usage", () => {
      // Test with probability that quickly exhausts capacity
      const result = simulator.simulate(0.9, 15);

      // Should show rapid initial growth, then plateau
      expect(result[0]).toBeCloseTo(90, 1); // Day 1: 100 * 0.9
      expect(result[1]).toBeCloseTo(180, 1); // Day 2: cumulative

      // Should eventually plateau as referrers exhaust capacity
      const finalDays = result.slice(-3);
      expect(finalDays[0]).toBeCloseTo(finalDays[1], 1);
      expect(finalDays[1]).toBeCloseTo(finalDays[2], 1);
    });

    test("should validate daysToTarget with known scenarios", () => {
      // Test exact scenarios where we can calculate expected days

      // With probability 1.0 and target 250, should take 3 days
      // Day 1: 100, Day 2: 200, Day 3: 300 (target reached)
      expect(simulator.daysToTarget(1.0, 250)).toBe(3);

      // With probability 0.5 and target 125, should take 3 days
      // Day 1: 50, Day 2: 100, Day 3: 150 (target reached)
      expect(simulator.daysToTarget(0.5, 125)).toBe(3);

      // Edge case: target exactly matches daily capacity
      expect(simulator.daysToTarget(1.0, 100)).toBe(1);
      expect(simulator.daysToTarget(0.5, 50)).toBe(1);
    });

    test("should handle maximum capacity scenarios precisely", () => {
      // Maximum possible referrals: 100 referrers * 10 capacity = 1000
      expect(simulator.daysToTarget(1.0, 1000)).toBe(10);
      expect(simulator.daysToTarget(1.0, 999)).toBe(10);
      expect(simulator.daysToTarget(1.0, 901)).toBe(10);
      expect(simulator.daysToTarget(1.0, 900)).toBe(9);
    });
  });

  describe("Performance Tests", () => {
    test("should handle large day counts efficiently", () => {
      const startTime = Date.now();

      // Test with 10,000 days
      const result = simulator.simulate(0.1, 10000);

      const endTime = Date.now();
      const executionTime = endTime - startTime;

      // Should complete within reasonable time (less than 1 second)
      expect(executionTime).toBeLessThan(1000);
      expect(result).toHaveLength(10000);

      // Results should be valid
      expect(result[0]).toBeGreaterThan(0);
      expect(result[9999]).toBeGreaterThanOrEqual(result[0]);
    });

    test("should handle very large day counts with high probability", () => {
      const startTime = Date.now();

      // Test with 50,000 days and high probability
      const result = simulator.simulate(0.8, 50000);

      const endTime = Date.now();
      const executionTime = endTime - startTime;

      // Should complete within reasonable time (less than 2 seconds)
      expect(executionTime).toBeLessThan(2000);
      expect(result).toHaveLength(50000);

      // Should plateau after capacity exhaustion
      const plateauStart = result.findIndex(
        (val, idx) => idx > 0 && Math.abs(val - result[idx - 1]) < 0.001,
      );
      expect(plateauStart).toBeGreaterThan(0);
      expect(plateauStart).toBeLessThan(20); // Should plateau within ~15 days with 0.8 probability
    });

    test("should handle daysToTarget performance with large targets", () => {
      const startTime = Date.now();

      // Test with target close to maximum capacity
      const days = simulator.daysToTarget(0.1, 900);

      const endTime = Date.now();
      const executionTime = endTime - startTime;

      // Should complete quickly even for large targets
      expect(executionTime).toBeLessThan(500);
      expect(days).toBeGreaterThan(0);
      expect(days).toBeLessThan(10000); // Should be reasonable
    });

    test("should maintain memory efficiency with large simulations", () => {
      // Test memory usage doesn't grow excessively
      const initialMemory = process.memoryUsage().heapUsed;

      // Run multiple large simulations
      for (let i = 0; i < 10; i++) {
        const result = simulator.simulate(0.2, 5000);
        expect(result).toHaveLength(5000);
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      // Memory increase should be reasonable (less than 50MB)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    });

    test("should handle edge case performance with zero probability", () => {
      const startTime = Date.now();

      // Test with zero probability and large day count
      const result = simulator.simulate(0.0, 100000);

      const endTime = Date.now();
      const executionTime = endTime - startTime;

      // Should complete within reasonable time (even with zero probability, still needs to iterate)
      expect(executionTime).toBeLessThan(5000);
      expect(result).toHaveLength(100000);

      // All values should be zero
      result.forEach((value) => expect(value).toBe(0));
    });

    test("should handle performance with probability 1.0 and large days", () => {
      const startTime = Date.now();

      // Test with probability 1.0 - should plateau quickly
      const result = simulator.simulate(1.0, 10000);

      const endTime = Date.now();
      const executionTime = endTime - startTime;

      // Should complete quickly due to early plateau
      expect(executionTime).toBeLessThan(500);
      expect(result).toHaveLength(10000);

      // Should plateau at 1000 after day 10
      for (let i = 10; i < result.length; i++) {
        expect(result[i]).toBe(1000);
      }
    });
  });
});
