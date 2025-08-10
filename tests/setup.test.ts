/**
 * Basic setup test to verify TypeScript and Jest configuration
 */
describe("Project Setup", () => {
  it("should have TypeScript compilation working", () => {
    // Test basic TypeScript features
    const testString: string = "Hello, TypeScript!";
    const testNumber: number = 42;
    const testArray: number[] = [1, 2, 3];

    expect(testString).toBe("Hello, TypeScript!");
    expect(testNumber).toBe(42);
    expect(testArray).toHaveLength(3);
  });

  it("should import types correctly", () => {
    // Test that we can import our custom types
    const { ReferralError } = require("../src/types/errors");

    expect(ReferralError.INVALID_USER_ID).toBe("Invalid user ID format");
    expect(ReferralError.SELF_REFERRAL).toBe("Users cannot refer themselves");
  });

  it("should handle Set operations for user referrals", () => {
    // Test Set operations that will be used for direct referrals
    const referrals = new Set<string>();

    referrals.add("user1");
    referrals.add("user2");
    referrals.add("user1"); // Duplicate should be ignored

    expect(referrals.size).toBe(2);
    expect(referrals.has("user1")).toBe(true);
    expect(referrals.has("user3")).toBe(false);
  });

  it("should handle Map operations for graph storage", () => {
    // Test Map operations that will be used for adjacency lists
    const adjacencyList = new Map<string, Set<string>>();

    adjacencyList.set("user1", new Set(["user2", "user3"]));
    adjacencyList.set("user2", new Set(["user4"]));

    expect(adjacencyList.get("user1")?.size).toBe(2);
    expect(adjacencyList.get("user2")?.has("user4")).toBe(true);
    expect(adjacencyList.has("user3")).toBe(false);
  });
});
