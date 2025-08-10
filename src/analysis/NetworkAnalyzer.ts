import { INetworkAnalyzer, NetworkCache } from "../types/analysis";
import { IReferralGraph } from "../types/graph";
import { RankedUser } from "../types/user";
import { ConsoleLogger, Logger } from "../utils/Logger";
import { ReferralError, ReferralNetworkError } from "../types/errors";

/**
 * Implementation of network analysis functionality
 */
export class NetworkAnalyzer implements INetworkAnalyzer {
  private graph: IReferralGraph;
  private cache: NetworkCache;
  private logger: Logger;

  constructor(graph: IReferralGraph, logger?: Logger) {
    this.graph = graph;
    this.cache = new NetworkCacheImpl();
    this.logger = logger ?? new ConsoleLogger("none");
  }

  /**
   * Calculate the total reach (direct + indirect referrals) for a user using BFS
   * @param userId - ID of the user
   * @returns Total number of users in the referral subtree
   * Time complexity: O(V + E) BFS over nodes reachable from userId. Cached per user.
   * Space complexity: O(V) for visited/queue.
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
    this.logger.debug("calculateTotalReach computed", { userId, totalReach });
    return totalReach;
  }

  /**
   * Get top referrers ranked by their total reach
   * @param k - Number of top referrers to return
   * @returns Array of ranked users sorted by total reach (descending)
   * Time complexity: O(V*(V+E)) to compute all reaches in worst-case + O(V log V) sort.
   * Space complexity: O(V).
   */
  getTopReferrersByReach(k: number): RankedUser[] {
    // Validate k parameter
    if (k <= 0 || !Number.isInteger(k)) {
      this.logger.warn("Invalid parameter for getTopReferrersByReach", { k });
      throw new ReferralNetworkError(
        ReferralError.INVALID_PARAMETER,
        "Invalid parameter value: k must be a positive integer",
      );
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
    const result = rankedUsers.slice(0, k);
    this.logger.debug("getTopReferrersByReach computed", {
      k,
      count: result.length,
    });
    return result;
  }

  /**
   * Calculate unique reach expansion using greedy algorithm
   * @returns Array of users ranked by their unique reach contribution
   * Time complexity: Precompute reach sets O(V*(V+E)); greedy selection up to O(V^2) set ops.
   * Space complexity: O(V^2) for reach sets in dense DAGs.
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

    this.logger.debug("calculateUniqueReachExpansion computed", {
      count: rankedInfluencers.length,
    });
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
   * Time complexity: Using precomputed shortest paths, ~O(V^3) to count path pass-throughs.
   * Space complexity: O(V^2) for distances plus O(V) for scores.
   */
  calculateFlowCentrality(): RankedUser[] {
    const allUsers = this.graph.getAllUsers();

    // Pre-compute all-pairs shortest paths
    const shortestPaths = this.computeAllPairsShortestPaths();

    // Calculate betweenness centrality for each user
    const centralityScores = new Map<string, number>();

    // Initialize centrality scores
    for (const userId of allUsers) {
      centralityScores.set(userId, 0);
    }

    // For each pair of users (s, t), count how many shortest paths pass through each intermediate user
    for (const sourceUser of allUsers) {
      for (const targetUser of allUsers) {
        if (sourceUser === targetUser) continue;

        const sourceDistances = shortestPaths.get(sourceUser);
        const targetDistances = shortestPaths.get(targetUser);

        if (!sourceDistances || !targetDistances) continue;

        const shortestDistance = sourceDistances.get(targetUser);
        if (shortestDistance === undefined || shortestDistance === Infinity)
          continue;

        // Check each potential intermediate user
        for (const intermediateUser of allUsers) {
          if (
            intermediateUser === sourceUser ||
            intermediateUser === targetUser
          )
            continue;

          const distSourceToIntermediate =
            sourceDistances.get(intermediateUser);

          // Get distance from intermediate to target by looking up intermediate's distances
          const intermediateDistances = shortestPaths.get(intermediateUser);
          const distIntermediateToTarget =
            intermediateDistances?.get(targetUser);

          if (
            distSourceToIntermediate === undefined ||
            distIntermediateToTarget === undefined
          )
            continue;
          if (
            distSourceToIntermediate === Infinity ||
            distIntermediateToTarget === Infinity
          )
            continue;

          // Check if intermediate user lies on shortest path: dist(s,v) + dist(v,t) == dist(s,t)
          if (
            distSourceToIntermediate + distIntermediateToTarget ===
            shortestDistance
          ) {
            const currentScore = centralityScores.get(intermediateUser) || 0;
            centralityScores.set(intermediateUser, currentScore + 1);
          }
        }
      }
    }

    // Convert to ranked users array
    const rankedUsers: RankedUser[] = [];
    for (const [userId, score] of centralityScores) {
      // Only include users with non-zero centrality scores
      if (score > 0) {
        rankedUsers.push({
          userId,
          score,
        });
      }
    }

    // Sort by centrality score in descending order
    rankedUsers.sort((a, b) => b.score - a.score);

    this.logger.debug("calculateFlowCentrality computed", {
      count: rankedUsers.length,
    });
    return rankedUsers;
  }

  /**
   * Compute all-pairs shortest paths using BFS from each node
   * @returns Map where each key is a source user and value is a Map of target users to distances
   * Time complexity: O(V*(V+E)) for BFS from every node.
   * Space complexity: O(V^2) for distances in dense graphs.
   */
  private computeAllPairsShortestPaths(): Map<string, Map<string, number>> {
    // Check if already cached
    if (this.cache.shortestPathCache.size > 0) {
      return this.cache.shortestPathCache;
    }

    const allUsers = this.graph.getAllUsers();

    // Compute shortest paths from each user using BFS
    for (const sourceUser of allUsers) {
      if (!this.cache.shortestPathCache.has(sourceUser)) {
        const distances = this.computeShortestPathsFromSource(sourceUser);
        this.cache.shortestPathCache.set(sourceUser, distances);
      }
    }

    return this.cache.shortestPathCache;
  }

  /**
   * Compute shortest paths from a single source using BFS
   * @param sourceUserId - The source user ID
   * @returns Map of target user IDs to their shortest distances from source
   * Time complexity: O(V + E) from source.
   * Space complexity: O(V).
   */
  private computeShortestPathsFromSource(
    sourceUserId: string,
  ): Map<string, number> {
    const distances = new Map<string, number>();
    const visited = new Set<string>();
    const queue: Array<{ userId: string; distance: number }> = [];

    // Initialize with source user
    queue.push({ userId: sourceUserId, distance: 0 });
    distances.set(sourceUserId, 0);

    while (queue.length > 0) {
      const { userId, distance } = queue.shift()!;

      if (visited.has(userId)) {
        continue;
      }

      visited.add(userId);

      // Explore all direct referrals (outgoing edges)
      const directReferrals = this.graph.getDirectReferrals(userId);
      for (const referralId of directReferrals) {
        if (!visited.has(referralId)) {
          const newDistance = distance + 1;

          // Only update if we found a shorter path or haven't visited this node yet
          if (
            !distances.has(referralId) ||
            newDistance < distances.get(referralId)!
          ) {
            distances.set(referralId, newDistance);
            queue.push({ userId: referralId, distance: newDistance });
          }
        }
      }
    }

    // Set infinite distance for unreachable users
    const allUsers = this.graph.getAllUsers();
    for (const userId of allUsers) {
      if (!distances.has(userId)) {
        distances.set(userId, Infinity);
      }
    }

    return distances;
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
