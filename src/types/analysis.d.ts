import { RankedUser } from "./user";
/**
 * Interface for network analysis operations
 */
export interface INetworkAnalyzer {
    /**
     * Calculate the total reach (direct + indirect referrals) for a user
     * @param userId - ID of the user
     * @returns Total number of users in the referral subtree
     */
    calculateTotalReach(userId: string): number;
    /**
     * Get top referrers ranked by their total reach
     * @param k - Number of top referrers to return
     * @returns Array of ranked users sorted by total reach (descending)
     */
    getTopReferrersByReach(k: number): RankedUser[];
    /**
     * Calculate unique reach expansion using greedy algorithm
     * @returns Array of users ranked by their unique reach contribution
     */
    calculateUniqueReachExpansion(): RankedUser[];
    /**
     * Calculate flow centrality (betweenness centrality) for all users
     * @returns Array of users ranked by their flow centrality score
     */
    calculateFlowCentrality(): RankedUser[];
}
/**
 * Cache interface for storing computed network metrics
 */
export interface NetworkCache {
    /** Cache for total reach calculations */
    totalReachCache: Map<string, number>;
    /** Cache for shortest path distances between users */
    shortestPathCache: Map<string, Map<string, number>>;
    /** Cache for downstream reach sets */
    reachSetsCache: Map<string, Set<string>>;
    /** Clear all cached data */
    clear(): void;
}
//# sourceMappingURL=analysis.d.ts.map