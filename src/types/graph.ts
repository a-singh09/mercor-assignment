/**
 * Interface for referral graph operations
 */
export interface IReferralGraph {
  /**
   * Add a new user to the graph
   * @param userId - Unique identifier for the user
   * @returns true if user was added successfully, false if user already exists
   */
  addUser(userId: string): boolean;

  /**
   * Add a referral relationship between two users
   * @param referrerId - ID of the user making the referral
   * @param candidateId - ID of the user being referred
   * @returns true if referral was added successfully, false otherwise
   */
  addReferral(referrerId: string, candidateId: string): boolean;

  /**
   * Get all direct referrals made by a user
   * @param userId - ID of the user
   * @returns Array of user IDs directly referred by the given user
   */
  getDirectReferrals(userId: string): string[];

  /**
   * Check if a user exists in the graph
   * @param userId - ID of the user to check
   * @returns true if user exists, false otherwise
   */
  hasUser(userId: string): boolean;

  /**
   * Get the referrer of a given user
   * @param userId - ID of the user
   * @returns ID of the referrer, or undefined if no referrer
   */
  getReferrer(userId: string): string | undefined;

  /**
   * Get all users in the graph
   * @returns Array of all user IDs
   */
  getAllUsers(): string[];

  /**
   * Validate that adding a referral would not create a cycle
   * @param referrerId - ID of the potential referrer
   * @param candidateId - ID of the potential candidate
   * @returns true if the referral would maintain acyclicity, false otherwise
   */
  validateAcyclicity(referrerId: string, candidateId: string): boolean;
}
