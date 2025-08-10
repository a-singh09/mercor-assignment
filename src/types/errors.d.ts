/**
 * Error types for the referral network system
 */
export declare enum ReferralError {
    INVALID_USER_ID = "Invalid user ID format",
    SELF_REFERRAL = "Users cannot refer themselves",
    DUPLICATE_REFERRER = "Candidate already has a referrer",
    CYCLE_DETECTED = "Referral would create a cycle",
    USER_NOT_FOUND = "User does not exist",
    INVALID_PROBABILITY = "Probability must be between 0 and 1",
    INVALID_PARAMETER = "Invalid parameter value",
    CAPACITY_EXCEEDED = "User has exceeded referral capacity"
}
/**
 * Custom error class for referral network operations
 */
export declare class ReferralNetworkError extends Error {
    readonly errorType: ReferralError;
    constructor(errorType: ReferralError, message?: string);
}
//# sourceMappingURL=errors.d.ts.map