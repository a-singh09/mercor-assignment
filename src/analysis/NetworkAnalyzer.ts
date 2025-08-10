import { INetworkAnalyzer, NetworkCache } from "../types/analysis";
import { IReferralGraph } from "../types/graph";
import { RankedUser } from "../types/user";

/**
 * Implementation of network analysis functionality
 */
export class NetworkAnalyzer implements INetworkAnalyzer {
  private graph: IReferralGraph;
  private cache: NetworkCache;

  constructor(graph: IReferralGraph) {
    this.graph = graph;
    this.cache = new NetworkCacheImpl();
  }

  /**
   * Calculate the total reach (direct + indirect referrals) for a user using BFS
   * @param userId - ID of the user
   * @returns Total number of users in the referral subtree
   */
  calculateTotalReach(userId: string): number {
    // Check cache first
    if (this.cache.totalReachCache.has(userId)) {
      return this.cache.totalReachCache.get(userId)!;
    }

    // Validate user exists
    if (!this.graph.hasUser(userId)) {
      return 0;
    }

    // Use BFS to traverse all reachable users
    const visited = new Set<string>();
    const queue = [userId];
    let totalReach = 0;

    while (queue.length > 0) {
      const currentUserId = queue.shift()!;

      if (visited.has(currentUserId)) {
        continue;
      }

      visited.add(currentUserId);

      // Don't count the starting user in the reach
      if (currentUserId !== userId) {
        totalReach++;
      }

      // Add all direct referrals to the queue
      const directReferrals = this.graph.getDirectReferrals(currentUserId);
      for (const referralId of directReferrals) {
        if (!visited.has(referralId)) {
          queue.push(referralId);
        }
      }
    }

    // Cache the result
    this.cache.totalReachCache.set(userId, totalReach);
    return totalReach;
  }

  /**
   * Get top referrers ranked by their total reach
   * @param k - Number of top referrers to return
   * @returns Array of ranked users sorted by total reach (descending)
   */
  getTopReferrersByReach(k: number): RankedUser[] {
    // Validate k parameter
    if (k <= 0 || !Number.isInteger(k)) {
      throw new Error("k must be a positive integer");
    }

    const allUsers = this.graph.getAllUsers();
    const rankedUsers: RankedUser[] = [];

    // Calculate total reach for each user
    for (const userId of allUsers) {
      const totalReach = this.calculateTotalReach(userId);

      // Only include users who have made referrals (reach > 0)
      if (totalReach > 0) {
        rankedUsers.push({
          userId,
          score: totalReach,
        });
      }
    }

    // Sort by score (total reach) in descending order
    rankedUsers.sort((a, b) => b.score - a.score);

    // Return top k results
    return rankedUsers.slice(0, k);
  }

  /**
   * Calculate unique reach expansion using greedy algorithm
   * @returns Array of users ranked by their unique reach contribution
   */
  calculateUniqueReachExpansion(): RankedUser[] {
    // Pre-compute downstream reach sets for all users
    const reachSets = this.precomputeReachSets();

    const allUsers = this.graph.getAllUsers();
    const coveredCandidates = new Set<string>();
    const rankedInfluencers: RankedUser[] = [];
    const remainingUsers = new Set(allUsers);

    // Greedy algorithm: iteratively select user with maximum unique reach
    while (remainingUsers.size > 0) {
      let bestUser: string | null = null;
      let bestUniqueReach = 0;
      let bestNewCandidates: Set<string> = new Set();

      // Find user with maximum unique reach expansion
      for (const userId of remainingUsers) {
        const userReachSet = reachSets.get(userId) || new Set();

        // Calculate unique candidates this user would add
        const newCandidates = new Set<string>();
        for (const candidate of userReachSet) {
          if (!coveredCandidates.has(candidate)) {
            newCandidates.add(candidate);
          }
        }

        const uniqueReach = newCandidates.size;

        if (uniqueReach > bestUniqueReach) {
          bestUser = userId;
          bestUniqueReach = uniqueReach;
          bestNewCandidates = newCandidates;
        }
      }

      // If no user adds unique reach, we're done
      if (bestUser === null || bestUniqueReach === 0) {
        break;
      }

      // Add best user to results and update covered candidates
      rankedInfluencers.push({
        userId: bestUser,
        score: bestUniqueReach,
      });

      // Update covered candidates with new ones from best user
      for (const candidate of bestNewCandidates) {
        coveredCandidates.add(candidate);
      }

      // Remove selected user from remaining users
      remainingUsers.delete(bestUser);
    }

    return rankedInfluencers;
  }

  /**
   * Pre-compute downstream reach sets for all users using BFS
   * @returns Map of userId to Set of all users reachable from that user
   */
  private precomputeReachSets(): Map<string, Set<string>> {
    // Check if already cached
    if (this.cache.reachSetsCache.size > 0) {
      return this.cache.reachSetsCache;
    }

    const allUsers = this.graph.getAllUsers();

    for (const userId of allUsers) {
      if (!this.cache.reachSetsCache.has(userId)) {
        const reachSet = this.computeDownstreamReachSet(userId);
        this.cache.reachSetsCache.set(userId, reachSet);
      }
    }

    return this.cache.reachSetsCache;
  }

  /**
   * Compute downstream reach set for a specific user using BFS
   * @param userId - ID of the user
   * @returns Set of all user IDs reachable from the given user
   */
  private computeDownstreamReachSet(userId: string): Set<string> {
    if (!this.graph.hasUser(userId)) {
      return new Set();
    }

    const reachSet = new Set<string>();
    const visited = new Set<string>();
    const queue = [userId];

    while (queue.length > 0) {
      const currentUserId = queue.shift()!;

      if (visited.has(currentUserId)) {
        continue;
      }

      visited.add(currentUserId);

      // Don't include the starting user in their own reach set
      if (currentUserId !== userId) {
        reachSet.add(currentUserId);
      }

      // Add all direct referrals to the queue
      const directReferrals = this.graph.getDirectReferrals(currentUserId);
      for (const referralId of directReferrals) {
        if (!visited.has(referralId)) {
          queue.push(referralId);
        }
      }
    }

    return reachSet;
  }

  /**
   * Calculate flow centrality (betweenness centrality) for all users
   * @returns Array of users ranked by their flow centrality score
   */
  calculateFlowCentrality(): RankedUser[] {
    // This will be implemented in task 6
    throw new Error("Flow centrality not yet implemented");
  }

  /**
   * Clear all cached data
   */
  clearCache(): void {
    this.cache.clear();
  }
}

/**
 * Implementation of the NetworkCache interface
 */
class NetworkCacheImpl implements NetworkCache {
  totalReachCache: Map<string, number>;
  shortestPathCache: Map<string, Map<string, number>>;
  reachSetsCache: Map<string, Set<string>>;

  constructor() {
    this.totalReachCache = new Map();
    this.shortestPathCache = new Map();
    this.reachSetsCache = new Map();
  }

  clear(): void {
    this.totalReachCache.clear();
    this.shortestPathCache.clear();
    this.reachSetsCache.clear();
  }
}
