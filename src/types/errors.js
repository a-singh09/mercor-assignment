"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReferralNetworkError = exports.ReferralError = void 0;
/**
 * Error types for the referral network system
 */
var ReferralError;
(function (ReferralError) {
    ReferralError["INVALID_USER_ID"] = "Invalid user ID format";
    ReferralError["SELF_REFERRAL"] = "Users cannot refer themselves";
    ReferralError["DUPLICATE_REFERRER"] = "Candidate already has a referrer";
    ReferralError["CYCLE_DETECTED"] = "Referral would create a cycle";
    ReferralError["USER_NOT_FOUND"] = "User does not exist";
    ReferralError["INVALID_PROBABILITY"] = "Probability must be between 0 and 1";
    ReferralError["INVALID_PARAMETER"] = "Invalid parameter value";
    ReferralError["CAPACITY_EXCEEDED"] = "User has exceeded referral capacity";
})(ReferralError || (exports.ReferralError = ReferralError = {}));
/**
 * Custom error class for referral network operations
 */
class ReferralNetworkError extends Error {
    constructor(errorType, message) {
        super(message || errorType);
        this.name = "ReferralNetworkError";
        this.errorType = errorType;
        // Maintains proper stack trace for where our error was thrown (only available on V8)
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, ReferralNetworkError);
        }
    }
}
exports.ReferralNetworkError = ReferralNetworkError;
//# sourceMappingURL=errors.js.map