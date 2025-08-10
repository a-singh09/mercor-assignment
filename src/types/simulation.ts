/**
 * Interface for network growth simulation
 */
export interface INetworkSimulator {
  /**
   * Simulate network growth over specified number of days
   * @param probability - Daily probability of successful referral per active referrer
   * @param days - Number of days to simulate
   * @returns Array where element i represents cumulative expected referrals at end of day i
   */
  simulate(probability: number, days: number): number[];

  /**
   * Calculate minimum days required to reach target referrals
   * @param probability - Daily probability of successful referral per active referrer
   * @param target - Target number of referrals to achieve
   * @returns Minimum number of days to reach target, or -1 if unachievable
   */
  daysToTarget(probability: number, target: number): number;
}

/**
 * State of the simulation at any point in time
 */
export interface SimulationState {
  /** Map of active referrer IDs to their remaining capacity */
  activeReferrers: Map<string, number>;

  /** Total number of referrals made so far */
  totalReferrals: number;

  /** Current day in the simulation */
  day: number;
}

/**
 * Function type for adoption probability based on bonus amount
 */
export type AdoptionProbFunction = (bonus: number) => number;

/**
 * Interface for bonus optimization
 */
export interface IBonusOptimizer {
  /**
   * Find minimum bonus amount to achieve target hires within specified days
   * @param days - Number of days available
   * @param targetHires - Target number of hires to achieve
   * @param adoptionProb - Function that returns adoption probability for given bonus
   * @param eps - Precision parameter for optimization
   * @returns Minimum bonus amount (rounded up to nearest $10), or null if unachievable
   */
  minBonusForTarget(
    days: number,
    targetHires: number,
    adoptionProb: AdoptionProbFunction,
    eps: number,
  ): number | null;
}
