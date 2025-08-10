import { INetworkSimulator, SimulationState } from "../types/simulation";
import { ConsoleLogger, Logger } from "../utils/Logger";
import { ReferralError, ReferralNetworkError } from "../types/errors";

/**
 * Network growth simulator that models referral network expansion over time
 */
export class NetworkSimulator implements INetworkSimulator {
  private static readonly INITIAL_REFERRERS = 100;
  private static readonly REFERRAL_CAPACITY = 10;
  private logger: Logger;

  constructor(logger?: Logger) {
    this.logger = logger ?? new ConsoleLogger("none");
  }

  /**
   * Initialize simulation state with 100 active referrers, each with capacity of 10
   */
  private initializeSimulation(): SimulationState {
    const activeReferrers = new Map<string, number>();

    // Create 100 initial active referrers with full capacity
    for (let i = 0; i < NetworkSimulator.INITIAL_REFERRERS; i++) {
      const referrerId = `referrer_${i}`;
      activeReferrers.set(referrerId, NetworkSimulator.REFERRAL_CAPACITY);
    }

    return {
      activeReferrers,
      totalReferrals: 0,
      day: 0,
    };
  }

  /**
   * Calculate expected referrals for a single day
   * @param activeReferrersCount Number of active referrers
   * @param probability Daily probability of successful referral per active referrer
   * @returns Expected number of referrals for the day
   */
  private calculateExpectedDailyReferrals(
    activeReferrersCount: number,
    probability: number,
  ): number {
    return activeReferrersCount * probability;
  }

  /**
   * Simulate network growth over specified number of days
   * Expected-value model (deterministic), not stochastic Monte Carlo.
   * @param probability Daily probability of successful referral per active referrer
   * @param days Number of days to simulate
   * @returns Array where element i represents cumulative expected referrals at end of day i
   * Time complexity: O(D * R_d), where D is days and R_d is active referrers per day (≤ 100 here).
   * Space complexity: O(D) for the returned time series.
   */
  simulate(probability: number, days: number): number[] {
    if (days <= 0) {
      this.logger.warn("Invalid parameter for simulate", { days });
      throw new ReferralNetworkError(
        ReferralError.INVALID_PARAMETER,
        "Days must be positive",
      );
    }

    if (probability < 0 || probability > 1) {
      this.logger.warn("Invalid probability for simulate", { probability });
      throw new ReferralNetworkError(
        ReferralError.INVALID_PROBABILITY,
        "Probability must be between 0 and 1",
      );
    }

    const results: number[] = [];
    let state = this.initializeSimulation();

    for (let day = 0; day < days; day++) {
      // Calculate expected referrals for this day
      const expectedDailyReferrals = this.calculateExpectedDailyReferrals(
        state.activeReferrers.size,
        probability,
      );

      // Update cumulative expected referrals
      const cumulativeExpected =
        day === 0
          ? expectedDailyReferrals
          : results[day - 1] + expectedDailyReferrals;

      results.push(cumulativeExpected);

      // Update state for next day (simulate capacity reduction)
      state = this.simulateExpectedState(state, probability);
    }

    return results;
  }

  /**
   * Update simulation state based on expected values rather than random simulation
   * @param state Current simulation state
   * @param probability Daily probability of successful referral per active referrer
   * @returns Updated simulation state with expected capacity reductions
   * Time complexity: O(R) over active referrers in current day (≤ 100).
   * Space complexity: O(R).
   */
  private simulateExpectedState(
    state: SimulationState,
    probability: number,
  ): SimulationState {
    const newActiveReferrers = new Map<string, number>();
    let expectedReferrals = 0;

    // Process each active referrer
    for (const [referrerId, remainingCapacity] of state.activeReferrers) {
      // Expected number of successful referrals for this referrer (capped by remaining capacity)
      const expectedSuccessful = Math.min(probability, remainingCapacity);
      expectedReferrals += expectedSuccessful;

      // Reduce capacity by expected successful referrals
      const newCapacity = remainingCapacity - expectedSuccessful;

      // Keep referrer active if they still have meaningful capacity
      if (newCapacity > 0.001) {
        // Small threshold to avoid floating point issues
        newActiveReferrers.set(referrerId, newCapacity);
      }
    }

    return {
      activeReferrers: newActiveReferrers,
      totalReferrals: state.totalReferrals + expectedReferrals,
      day: state.day + 1,
    };
  }

  /**
   * Calculate minimum days required to reach target referrals
   * @param probability Daily probability of successful referral per active referrer
   * @param target Target number of referrals to achieve
   * @returns Minimum number of days to reach target, or -1 if unachievable
   * Time complexity: proportional to simulated days until target or exhaustion (≤ 10 at p=1).
   * Space complexity: O(R) per day.
   */
  daysToTarget(probability: number, target: number): number {
    if (probability < 0 || probability > 1) {
      this.logger.warn("Invalid probability for daysToTarget", { probability });
      throw new ReferralNetworkError(
        ReferralError.INVALID_PROBABILITY,
        "Probability must be between 0 and 1",
      );
    }

    if (target <= 0) {
      return 0;
    }

    if (probability <= 0) {
      return -1; // Impossible to reach target with zero probability
    }

    // Calculate maximum possible referrals
    const maxPossibleReferrals =
      NetworkSimulator.INITIAL_REFERRERS * NetworkSimulator.REFERRAL_CAPACITY;
    if (target > maxPossibleReferrals) {
      return -1; // Target is unachievable
    }

    let state = this.initializeSimulation();
    let cumulativeReferrals = 0;
    let day = 0;

    while (cumulativeReferrals < target && state.activeReferrers.size > 0) {
      day++;

      // Calculate expected referrals for this day
      const expectedDailyReferrals = this.calculateExpectedDailyReferrals(
        state.activeReferrers.size,
        probability,
      );

      cumulativeReferrals += expectedDailyReferrals;

      // Check if we've reached the target
      if (cumulativeReferrals >= target) {
        return day;
      }

      // Update state for next day
      state = this.simulateExpectedState(state, probability);
    }

    // If we exit the loop without reaching target, it's unachievable
    return -1;
  }

  /**
   * Get current simulation state for testing purposes
   * @returns New initialized simulation state
   */
  getInitialState(): SimulationState {
    return this.initializeSimulation();
  }

  /**
   * Get the number of initial referrers (for testing)
   */
  static getInitialReferrersCount(): number {
    return NetworkSimulator.INITIAL_REFERRERS;
  }

  /**
   * Get the referral capacity per referrer (for testing)
   */
  static getReferralCapacity(): number {
    return NetworkSimulator.REFERRAL_CAPACITY;
  }
}
