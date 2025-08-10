import { ReferralGraph } from "../src/graph/ReferralGraph";
import { ReferralError, ReferralNetworkError } from "../src/types/errors";

describe("ReferralGraph", () => {
  let graph: ReferralGraph;

  beforeEach(() => {
    graph = new ReferralGraph();
  });

  describe("addUser", () => {
    it("should add a new user successfully", () => {
      const result = graph.addUser("user1");
      expect(result).toBe(true);
      expect(graph.hasUser("user1")).toBe(true);
    });

    it("should return false when adding an existing user", () => {
      graph.addUser("user1");
      const result = graph.addUser("user1");
      expect(result).toBe(false);
    });

    it("should throw error for invalid user ID - empty string", () => {
      expect(() => graph.addUser("")).toThrow(ReferralNetworkError);
      expect(() => graph.addUser("")).toThrow(ReferralError.INVALID_USER_ID);
    });

    it("should throw error for invalid user ID - whitespace only", () => {
      expect(() => graph.addUser("   ")).toThrow(ReferralNetworkError);
      expect(() => graph.addUser("   ")).toThrow(ReferralError.INVALID_USER_ID);
    });

    it("should throw error for invalid user ID - null or undefined", () => {
      expect(() => graph.addUser(null as any)).toThrow(ReferralNetworkError);
      expect(() => graph.addUser(undefined as any)).toThrow(
        ReferralNetworkError,
      );
    });

    it("should accept valid user IDs with various formats", () => {
      expect(graph.addUser("user123")).toBe(true);
      expect(graph.addUser("user-456")).toBe(true);
      expect(graph.addUser("user_789")).toBe(true);
      expect(graph.addUser("User With Spaces")).toBe(true);
    });
  });

  describe("addReferral", () => {
    beforeEach(() => {
      graph.addUser("referrer");
      graph.addUser("candidate");
    });

    it("should add a referral successfully", () => {
      const result = graph.addReferral("referrer", "candidate");
      expect(result).toBe(true);
      expect(graph.getReferrer("candidate")).toBe("referrer");
      expect(graph.getDirectReferrals("referrer")).toContain("candidate");
    });

    it("should throw error for self-referral", () => {
      expect(() => graph.addReferral("referrer", "referrer")).toThrow(
        ReferralNetworkError,
      );
      expect(() => graph.addReferral("referrer", "referrer")).toThrow(
        ReferralError.SELF_REFERRAL,
      );
    });

    it("should throw error when referrer doesn't exist", () => {
      expect(() => graph.addReferral("nonexistent", "candidate")).toThrow(
        ReferralNetworkError,
      );
      expect(() => graph.addReferral("nonexistent", "candidate")).toThrow(
        ReferralError.USER_NOT_FOUND,
      );
    });

    it("should throw error when candidate doesn't exist", () => {
      expect(() => graph.addReferral("referrer", "nonexistent")).toThrow(
        ReferralNetworkError,
      );
      expect(() => graph.addReferral("referrer", "nonexistent")).toThrow(
        ReferralError.USER_NOT_FOUND,
      );
    });

    it("should throw error when candidate already has a referrer", () => {
      graph.addUser("anotherReferrer");
      graph.addReferral("referrer", "candidate");

      expect(() => graph.addReferral("anotherReferrer", "candidate")).toThrow(
        ReferralNetworkError,
      );
      expect(() => graph.addReferral("anotherReferrer", "candidate")).toThrow(
        ReferralError.DUPLICATE_REFERRER,
      );
    });

    it("should throw error for invalid user IDs", () => {
      expect(() => graph.addReferral("", "candidate")).toThrow(
        ReferralNetworkError,
      );
      expect(() => graph.addReferral("referrer", "")).toThrow(
        ReferralNetworkError,
      );
      expect(() => graph.addReferral(null as any, "candidate")).toThrow(
        ReferralNetworkError,
      );
    });
  });

  describe("cycle detection", () => {
    beforeEach(() => {
      // Create a chain: A -> B -> C
      graph.addUser("A");
      graph.addUser("B");
      graph.addUser("C");
      graph.addReferral("A", "B");
      graph.addReferral("B", "C");
    });

    it("should prevent direct cycles", () => {
      expect(() => graph.addReferral("B", "A")).toThrow(ReferralNetworkError);
      expect(() => graph.addReferral("B", "A")).toThrow(
        ReferralError.CYCLE_DETECTED,
      );
    });

    it("should prevent indirect cycles", () => {
      expect(() => graph.addReferral("C", "A")).toThrow(ReferralNetworkError);
      expect(() => graph.addReferral("C", "A")).toThrow(
        ReferralError.CYCLE_DETECTED,
      );
    });

    it("should allow valid referrals that don't create cycles", () => {
      graph.addUser("D");
      expect(() => graph.addReferral("C", "D")).not.toThrow();
      // D already has referrer C, so A trying to refer D should throw duplicate referrer error
      expect(() => graph.addReferral("A", "D")).toThrow(
        ReferralError.DUPLICATE_REFERRER,
      );
    });

    it("should handle complex cycle detection", () => {
      // Create a more complex structure
      graph.addUser("D");
      graph.addUser("E");
      graph.addReferral("C", "D");
      graph.addReferral("A", "E"); // A can refer to E (no cycle)

      // Try to create cycle: E -> B (which would create E -> B -> C -> D and B is already referred by A)
      expect(() => graph.addReferral("E", "B")).toThrow(
        ReferralError.DUPLICATE_REFERRER,
      );
    });

    describe("comprehensive cycle scenarios", () => {
      it("should detect cycles in star topology", () => {
        // Create star: center -> leaf1, center -> leaf2, center -> leaf3
        graph = new ReferralGraph();
        const users = ["center", "leaf1", "leaf2", "leaf3"];
        users.forEach((user) => graph.addUser(user));

        graph.addReferral("center", "leaf1");
        graph.addReferral("center", "leaf2");
        graph.addReferral("center", "leaf3");

        // Any leaf trying to refer center should create a cycle
        expect(() => graph.addReferral("leaf1", "center")).toThrow(
          ReferralError.CYCLE_DETECTED,
        );
        expect(() => graph.addReferral("leaf2", "center")).toThrow(
          ReferralError.CYCLE_DETECTED,
        );
        expect(() => graph.addReferral("leaf3", "center")).toThrow(
          ReferralError.CYCLE_DETECTED,
        );
      });

      it("should detect cycles in deep chain", () => {
        // Create deep chain: A -> B -> C -> D -> E -> F
        graph = new ReferralGraph();
        const users = ["A", "B", "C", "D", "E", "F"];
        users.forEach((user) => graph.addUser(user));

        graph.addReferral("A", "B");
        graph.addReferral("B", "C");
        graph.addReferral("C", "D");
        graph.addReferral("D", "E");
        graph.addReferral("E", "F");

        // Any node trying to refer an ancestor should create a cycle
        expect(() => graph.addReferral("F", "A")).toThrow(
          ReferralError.CYCLE_DETECTED,
        );

        // Test additional cycle scenarios
        graph.addUser("G");

        // F -> G -> A would create a cycle (A has no referrer initially)
        graph.addReferral("F", "G");
        expect(() => graph.addReferral("G", "A")).toThrow(
          ReferralError.CYCLE_DETECTED,
        );
      });

      it("should detect cycles in tree with multiple branches", () => {
        // Create tree structure:
        //       root
        //      /    \
        //   left    right
        //   /  \      |
        // ll   lr    rc
        graph = new ReferralGraph();
        const users = ["root", "left", "right", "ll", "lr", "rc"];
        users.forEach((user) => graph.addUser(user));

        graph.addReferral("root", "left");
        graph.addReferral("root", "right");
        graph.addReferral("left", "ll");
        graph.addReferral("left", "lr");
        graph.addReferral("right", "rc");

        // Any descendant trying to refer root should create a cycle
        expect(() => graph.addReferral("ll", "root")).toThrow(
          ReferralError.CYCLE_DETECTED,
        );
        expect(() => graph.addReferral("lr", "root")).toThrow(
          ReferralError.CYCLE_DETECTED,
        );
        expect(() => graph.addReferral("rc", "root")).toThrow(
          ReferralError.CYCLE_DETECTED,
        );

        // Cross-branch cycles should also be detected
        // Add new users to test cross-branch cycles without duplicate referrer issues
        graph.addUser("newLeft");
        graph.addUser("newRight");

        // Test cross-branch cycle: ll -> newLeft -> root would create cycle
        graph.addReferral("ll", "newLeft");
        expect(() => graph.addReferral("newLeft", "root")).toThrow(
          ReferralError.CYCLE_DETECTED,
        );
      });

      it("should handle disconnected components correctly", () => {
        // Create two separate components: A -> B -> C and X -> Y -> Z
        graph = new ReferralGraph();
        const users = ["A", "B", "C", "X", "Y", "Z"];
        users.forEach((user) => graph.addUser(user));

        // First component
        graph.addReferral("A", "B");
        graph.addReferral("B", "C");

        // Second component
        graph.addReferral("X", "Y");
        graph.addReferral("Y", "Z");

        // Cross-component referrals should be allowed (no cycles)
        graph.addUser("newNode");
        expect(() => graph.addReferral("C", "newNode")).not.toThrow();

        // But cycles within components should still be detected
        // Add a new user to test cycle within second component
        graph.addUser("W");
        graph.addReferral("Z", "W");
        expect(() => graph.addReferral("W", "X")).toThrow(
          ReferralError.CYCLE_DETECTED,
        );
      });

      it("should handle single node self-referral attempt", () => {
        graph = new ReferralGraph();
        graph.addUser("solo");

        // Self-referral should be caught by self-referral check, not cycle detection
        expect(() => graph.addReferral("solo", "solo")).toThrow(
          ReferralError.SELF_REFERRAL,
        );
      });

      it("should handle empty graph edge cases", () => {
        graph = new ReferralGraph();

        // Attempting to validate acyclicity with non-existent users
        expect(graph.validateAcyclicity("nonexistent1", "nonexistent2")).toBe(
          false,
        );
      });

      it("should detect complex indirect cycles", () => {
        // Create a complex structure that could form a cycle through multiple paths
        graph = new ReferralGraph();
        const users = ["A", "B", "C", "D", "E", "F", "G"];
        users.forEach((user) => graph.addUser(user));

        // Create structure: A -> B -> C -> D
        //                   A -> E -> F -> G
        graph.addReferral("A", "B");
        graph.addReferral("B", "C");
        graph.addReferral("C", "D");
        graph.addReferral("A", "E");
        graph.addReferral("E", "F");
        graph.addReferral("F", "G");

        // Now if G tries to refer A, it would create a cycle through the E->F->G path
        expect(() => graph.addReferral("G", "A")).toThrow(
          ReferralError.CYCLE_DETECTED,
        );

        // Similarly, D trying to refer A would create a cycle through B->C->D path
        expect(() => graph.addReferral("D", "A")).toThrow(
          ReferralError.CYCLE_DETECTED,
        );

        // But cross-branch connections that don't create cycles should work
        graph.addUser("H");
        expect(() => graph.addReferral("D", "H")).not.toThrow();
        expect(() => graph.addReferral("G", "H")).toThrow(
          ReferralError.DUPLICATE_REFERRER,
        ); // H already has D as referrer
      });

      it("should handle large chain cycle detection efficiently", () => {
        // Test performance with a larger chain
        graph = new ReferralGraph();
        const chainLength = 100;
        const users = Array.from({ length: chainLength }, (_, i) => `user${i}`);

        users.forEach((user) => graph.addUser(user));

        // Create chain: user0 -> user1 -> user2 -> ... -> user99
        for (let i = 0; i < chainLength - 1; i++) {
          graph.addReferral(`user${i}`, `user${i + 1}`);
        }

        // Last user trying to refer first should create cycle
        expect(() =>
          graph.addReferral(`user${chainLength - 1}`, "user0"),
        ).toThrow(ReferralError.CYCLE_DETECTED);

        // Add a new user and have a middle user refer it, then test cycle with root
        graph.addUser("newUser");
        graph.addReferral("user50", "newUser");
        expect(() => graph.addReferral("newUser", "user0")).toThrow(
          ReferralError.CYCLE_DETECTED,
        );
      });
    });
  });

  describe("validateAcyclicity", () => {
    beforeEach(() => {
      graph.addUser("A");
      graph.addUser("B");
      graph.addUser("C");
    });

    it("should return true for valid acyclic referrals", () => {
      expect(graph.validateAcyclicity("A", "B")).toBe(true);
      graph.addReferral("A", "B");
      expect(graph.validateAcyclicity("B", "C")).toBe(true);
    });

    it("should return false for cyclic referrals", () => {
      graph.addReferral("A", "B");
      graph.addReferral("B", "C");
      expect(graph.validateAcyclicity("C", "A")).toBe(false);
      expect(graph.validateAcyclicity("B", "A")).toBe(false);
    });

    it("should return false for non-existent users", () => {
      expect(graph.validateAcyclicity("nonexistent", "B")).toBe(false);
      expect(graph.validateAcyclicity("A", "nonexistent")).toBe(false);
    });
  });

  describe("getDirectReferrals", () => {
    beforeEach(() => {
      graph.addUser("referrer");
      graph.addUser("candidate1");
      graph.addUser("candidate2");
      graph.addUser("candidate3");
    });

    it("should return empty array for user with no referrals", () => {
      expect(graph.getDirectReferrals("referrer")).toEqual([]);
    });

    it("should return empty array for non-existent user", () => {
      expect(graph.getDirectReferrals("nonexistent")).toEqual([]);
    });

    it("should return all direct referrals", () => {
      graph.addReferral("referrer", "candidate1");
      graph.addReferral("referrer", "candidate2");

      const referrals = graph.getDirectReferrals("referrer");
      expect(referrals).toHaveLength(2);
      expect(referrals).toContain("candidate1");
      expect(referrals).toContain("candidate2");
    });

    it("should not return indirect referrals", () => {
      graph.addUser("indirectCandidate");
      graph.addReferral("referrer", "candidate1");
      graph.addReferral("candidate1", "indirectCandidate");

      const referrals = graph.getDirectReferrals("referrer");
      expect(referrals).toHaveLength(1);
      expect(referrals).toContain("candidate1");
      expect(referrals).not.toContain("indirectCandidate");
    });
  });

  describe("hasUser", () => {
    it("should return false for non-existent user", () => {
      expect(graph.hasUser("nonexistent")).toBe(false);
    });

    it("should return true for existing user", () => {
      graph.addUser("user1");
      expect(graph.hasUser("user1")).toBe(true);
    });
  });

  describe("getReferrer", () => {
    beforeEach(() => {
      graph.addUser("referrer");
      graph.addUser("candidate");
    });

    it("should return undefined for user with no referrer", () => {
      expect(graph.getReferrer("candidate")).toBeUndefined();
    });

    it("should return undefined for non-existent user", () => {
      expect(graph.getReferrer("nonexistent")).toBeUndefined();
    });

    it("should return referrer ID for user with referrer", () => {
      graph.addReferral("referrer", "candidate");
      expect(graph.getReferrer("candidate")).toBe("referrer");
    });
  });

  describe("getAllUsers", () => {
    it("should return empty array for empty graph", () => {
      expect(graph.getAllUsers()).toEqual([]);
    });

    it("should return all user IDs", () => {
      graph.addUser("user1");
      graph.addUser("user2");
      graph.addUser("user3");

      const users = graph.getAllUsers();
      expect(users).toHaveLength(3);
      expect(users).toContain("user1");
      expect(users).toContain("user2");
      expect(users).toContain("user3");
    });
  });

  describe("integration tests", () => {
    it("should handle complex referral network", () => {
      // Create a tree structure
      const users = [
        "root",
        "child1",
        "child2",
        "grandchild1",
        "grandchild2",
        "grandchild3",
      ];
      users.forEach((user) => graph.addUser(user));

      // Build the tree
      graph.addReferral("root", "child1");
      graph.addReferral("root", "child2");
      graph.addReferral("child1", "grandchild1");
      graph.addReferral("child1", "grandchild2");
      graph.addReferral("child2", "grandchild3");

      // Verify structure
      expect(graph.getDirectReferrals("root")).toHaveLength(2);
      expect(graph.getDirectReferrals("child1")).toHaveLength(2);
      expect(graph.getDirectReferrals("child2")).toHaveLength(1);
      expect(graph.getDirectReferrals("grandchild1")).toHaveLength(0);

      // Verify referrers
      expect(graph.getReferrer("child1")).toBe("root");
      expect(graph.getReferrer("grandchild1")).toBe("child1");
      expect(graph.getReferrer("grandchild3")).toBe("child2");

      // Verify cycle prevention
      expect(() => graph.addReferral("grandchild1", "root")).toThrow(
        ReferralError.CYCLE_DETECTED,
      );
    });

    it("should maintain data consistency across operations", () => {
      graph.addUser("A");
      graph.addUser("B");
      graph.addUser("C");

      // Add referrals
      graph.addReferral("A", "B");
      graph.addReferral("B", "C");

      // Verify all data structures are consistent
      expect(graph.hasUser("A")).toBe(true);
      expect(graph.hasUser("B")).toBe(true);
      expect(graph.hasUser("C")).toBe(true);

      expect(graph.getDirectReferrals("A")).toEqual(["B"]);
      expect(graph.getDirectReferrals("B")).toEqual(["C"]);
      expect(graph.getDirectReferrals("C")).toEqual([]);

      expect(graph.getReferrer("A")).toBeUndefined();
      expect(graph.getReferrer("B")).toBe("A");
      expect(graph.getReferrer("C")).toBe("B");

      expect(graph.getAllUsers()).toHaveLength(3);
    });
  });
});
