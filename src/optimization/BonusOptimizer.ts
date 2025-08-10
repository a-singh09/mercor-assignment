import { AdoptionProbFunction, IBonusOptimizer } from "../types/simulation";
import { NetworkSimulator } from "../simulation/NetworkSimulator";

/**
 * Optimizes the minimum bonus required to hit a target within a time budget.
 */
export class BonusOptimizer implements IBonusOptimizer {
  private simulator: NetworkSimulator;

  constructor(simulator?: NetworkSimulator) {
    this.simulator = simulator ?? new NetworkSimulator();
  }

  /**
   * Find minimum bonus amount to achieve target hires within specified days.
   * Uses binary search over bonus, assuming adoptionProb is monotonic non-decreasing.
   */
  minBonusForTarget(
    days: number,
    targetHires: number,
    adoptionProb: AdoptionProbFunction,
    eps: number,
  ): number | null {
    // Validate inputs
    if (!Number.isFinite(days) || days <= 0) {
      throw new Error("Days must be a positive number");
    }
    if (!Number.isFinite(targetHires) || targetHires <= 0) {
      throw new Error("Target hires must be a positive number");
    }
    if (!Number.isFinite(eps) || eps <= 0) {
      throw new Error("eps must be a positive number");
    }

    // Quick unachievable checks using simulator constraints
    // Cap limit: 100 initial referrers * 10 capacity = 1000 maximum possible referrals
    const MAX_POSSIBLE =
      NetworkSimulator.getInitialReferrersCount() *
      NetworkSimulator.getReferralCapacity();
    if (targetHires > MAX_POSSIBLE) {
      return null;
    }

    // If even with probability 1 the target can't be reached within the given days, return null
    const minDaysAtMaxProb = this.simulator.daysToTarget(1.0, targetHires);
    if (minDaysAtMaxProb === -1 || minDaysAtMaxProb > days) {
      return null;
    }

    // If zero bonus is sufficient, return 0
    const p0 = this.clamp01(adoptionProb(0));
    const d0 = this.simulator.daysToTarget(p0, targetHires);
    if (d0 !== -1 && d0 <= days) {
      return 0;
    }

    // Exponential search to find an upper bound where condition holds
    let low = 0;
    let high = 10; // start with a small bonus guess

    // To avoid infinite loops, limit how many times we expand the search window
    const MAX_EXPANSIONS = 32;
    let expansions = 0;

    while (expansions < MAX_EXPANSIONS) {
      const pHigh = this.clamp01(adoptionProb(high));
      const dHigh = this.simulator.daysToTarget(pHigh, targetHires);
      if (dHigh !== -1 && dHigh <= days) {
        break; // found an upper bound
      }

      // If adoption probability is already saturated near 1 and still not enough,
      // then there is no feasible finite bonus (should have been caught by the 1.0 check; this is a safety guard)
      if (pHigh >= 0.999999) {
        // Despite saturation, days still too high -> impossible
        return null;
      }

      low = high;
      high *= 2;
      expansions++;
    }

    if (expansions >= MAX_EXPANSIONS) {
      // Could not find a satisfying upper bound within reasonable range
      return null;
    }

    // Binary search within [low, high] with iteration cap for convergence safety
    const MAX_BINARY_ITERS = 1024;
    let iter = 0;
    while (high - low > eps && iter < MAX_BINARY_ITERS) {
      const mid = (low + high) / 2;
      const pMid = this.clamp01(adoptionProb(mid));
      const dMid = this.simulator.daysToTarget(pMid, targetHires);

      if (dMid !== -1 && dMid <= days) {
        high = mid; // feasible, try smaller bonus
      } else {
        low = mid; // infeasible, need larger bonus
      }

      iter++;
    }

    // Round up to nearest $10 as per requirements
    const rounded = this.roundUpToNearest10(high);

    // Final safety check; rounding up should only improve feasibility as prob is monotonic non-decreasing
    const pRounded = this.clamp01(adoptionProb(rounded));
    const dRounded = this.simulator.daysToTarget(pRounded, targetHires);
    if (dRounded === -1 || dRounded > days) {
      // If rounding somehow breaks feasibility due to non-monotonic function (contrary to assumption),
      // attempt to increase to next increment once
      const fallback = this.roundUpToNearest10(rounded + 10);
      const pFallback = this.clamp01(adoptionProb(fallback));
      const dFallback = this.simulator.daysToTarget(pFallback, targetHires);
      if (dFallback === -1 || dFallback > days) {
        return null;
      }
      return fallback;
    }

    return rounded;
  }

  private clamp01(x: number): number {
    if (!Number.isFinite(x)) return 0;
    if (x < 0) return 0;
    if (x > 1) return 1;
    return x;
  }

  private roundUpToNearest10(x: number): number {
    if (x <= 0) return 0;
    return Math.ceil(x / 10) * 10;
  }
}
