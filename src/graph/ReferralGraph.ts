import { IReferralGraph } from "../types/graph";
import { User } from "../types/user";
import { ReferralError, ReferralNetworkError } from "../types/errors";

/**
 * Implementation of the referral graph using adjacency lists
 */
export class ReferralGraph implements IReferralGraph {
  private users: Map<string, User>;
  private adjacencyList: Map<string, Set<string>>; // userId -> set of direct referrals
  private reverseAdjacencyList: Map<string, Set<string>>; // userId -> set of users who referred them

  constructor() {
    this.users = new Map();
    this.adjacencyList = new Map();
    this.reverseAdjacencyList = new Map();
  }

  /**
   * Add a new user to the graph
   */
  addUser(userId: string): boolean {
    // Validate user ID
    if (!userId || typeof userId !== "string" || userId.trim() === "") {
      throw new ReferralNetworkError(ReferralError.INVALID_USER_ID);
    }

    // Check if user already exists
    if (this.users.has(userId)) {
      return false;
    }

    // Create new user
    const user: User = {
      id: userId,
      directReferrals: new Set<string>(),
      isActive: true,
      referralCapacity: 10, // Default capacity as per requirements
      referralsMade: 0,
    };

    // Add to all data structures
    this.users.set(userId, user);
    this.adjacencyList.set(userId, new Set<string>());
    this.reverseAdjacencyList.set(userId, new Set<string>());

    return true;
  }

  /**
   * Add a referral relationship between two users
   */
  addReferral(referrerId: string, candidateId: string): boolean {
    // Validate input
    if (!referrerId || !candidateId) {
      throw new ReferralNetworkError(ReferralError.INVALID_USER_ID);
    }

    // Check for self-referral
    if (referrerId === candidateId) {
      throw new ReferralNetworkError(ReferralError.SELF_REFERRAL);
    }

    // Check if both users exist
    if (!this.users.has(referrerId) || !this.users.has(candidateId)) {
      throw new ReferralNetworkError(ReferralError.USER_NOT_FOUND);
    }

    const candidate = this.users.get(candidateId)!;

    // Check if candidate already has a referrer
    if (candidate.referrerId !== undefined) {
      throw new ReferralNetworkError(ReferralError.DUPLICATE_REFERRER);
    }

    // Check for cycles
    if (!this.validateAcyclicity(referrerId, candidateId)) {
      throw new ReferralNetworkError(ReferralError.CYCLE_DETECTED);
    }

    // Add the referral relationship
    const referrer = this.users.get(referrerId)!;

    // Update user objects
    candidate.referrerId = referrerId;
    referrer.directReferrals.add(candidateId);
    referrer.referralsMade++;

    // Update adjacency lists
    this.adjacencyList.get(referrerId)!.add(candidateId);
    this.reverseAdjacencyList.get(candidateId)!.add(referrerId);

    return true;
  }

  /**
   * Get all direct referrals made by a user
   */
  getDirectReferrals(userId: string): string[] {
    if (!this.users.has(userId)) {
      return [];
    }

    const referrals = this.adjacencyList.get(userId);
    return referrals ? Array.from(referrals) : [];
  }

  /**
   * Check if a user exists in the graph
   */
  hasUser(userId: string): boolean {
    return this.users.has(userId);
  }

  /**
   * Get the referrer of a given user
   */
  getReferrer(userId: string): string | undefined {
    const user = this.users.get(userId);
    return user?.referrerId;
  }

  /**
   * Get all users in the graph
   */
  getAllUsers(): string[] {
    return Array.from(this.users.keys());
  }

  /**
   * Validate that adding a referral would not create a cycle
   * Uses DFS to detect if candidateId can reach referrerId
   */
  validateAcyclicity(referrerId: string, candidateId: string): boolean {
    // If either user doesn't exist, we can't validate properly
    if (!this.users.has(referrerId) || !this.users.has(candidateId)) {
      return false;
    }

    // Use DFS to check if candidateId can reach referrerId
    const visited = new Set<string>();
    const stack = [candidateId];

    while (stack.length > 0) {
      const currentUserId = stack.pop()!;

      if (visited.has(currentUserId)) {
        continue;
      }

      visited.add(currentUserId);

      // If we can reach the referrer from the candidate, it would create a cycle
      if (currentUserId === referrerId) {
        return false;
      }

      // Add all direct referrals of current user to the stack
      const directReferrals = this.adjacencyList.get(currentUserId);
      if (directReferrals) {
        for (const referralId of directReferrals) {
          if (!visited.has(referralId)) {
            stack.push(referralId);
          }
        }
      }
    }

    return true;
  }
}
