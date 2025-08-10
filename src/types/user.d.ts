/**
 * Core user interface for the referral network system
 */
export interface User {
    /** Unique identifier for the user */
    id: string;
    /** ID of the user who referred this user (if any) */
    referrerId?: string;
    /** Set of user IDs that this user has directly referred */
    directReferrals: Set<string>;
    /** Whether the user is currently active in the system */
    isActive: boolean;
    /** Maximum number of referrals this user can make */
    referralCapacity: number;
    /** Number of referrals this user has already made */
    referralsMade: number;
}
/**
 * Ranked user result for analysis operations
 */
export interface RankedUser {
    /** User ID */
    userId: string;
    /** Score/metric value for this user */
    score: number;
}
//# sourceMappingURL=user.d.ts.map