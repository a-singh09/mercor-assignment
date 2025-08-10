import { ReferralGraph } from "../src/graph/ReferralGraph";
import { NetworkAnalyzer } from "../src/analysis/NetworkAnalyzer";

describe("NetworkAnalyzer", () => {
  let graph: ReferralGraph;
  let analyzer: NetworkAnalyzer;

  beforeEach(() => {
    graph = new ReferralGraph();
    analyzer = new NetworkAnalyzer(graph);
  });

  describe("calculateTotalReach", () => {
    it("should return 0 for non-existent user", () => {
      expect(analyzer.calculateTotalReach("nonexistent")).toBe(0);
    });

    it("should return 0 for user with no referrals", () => {
      graph.addUser("user1");
      expect(analyzer.calculateTotalReach("user1")).toBe(0);
    });

    it("should calculate direct referrals correctly", () => {
      // Create simple chain: user1 -> user2 -> user3
      graph.addUser("user1");
      graph.addUser("user2");
      graph.addUser("user3");

      graph.addReferral("user1", "user2");
      graph.addReferral("user2", "user3");

      expect(analyzer.calculateTotalReach("user1")).toBe(2); // user2 + user3
      expect(analyzer.calculateTotalReach("user2")).toBe(1); // user3
      expect(analyzer.calculateTotalReach("user3")).toBe(0); // no referrals
    });

    it("should calculate tree structure reach correctly", () => {
      // Create tree: user1 -> [user2, user3], user2 -> [user4, user5]
      graph.addUser("user1");
      graph.addUser("user2");
      graph.addUser("user3");
      graph.addUser("user4");
      graph.addUser("user5");

      graph.addReferral("user1", "user2");
      graph.addReferral("user1", "user3");
      graph.addReferral("user2", "user4");
      graph.addReferral("user2", "user5");

      expect(analyzer.calculateTotalReach("user1")).toBe(4); // user2, user3, user4, user5
      expect(analyzer.calculateTotalReach("user2")).toBe(2); // user4, user5
      expect(analyzer.calculateTotalReach("user3")).toBe(0); // no referrals
    });

    it("should handle complex network topology", () => {
      // Create more complex network
      const users = ["A", "B", "C", "D", "E", "F", "G"];
      users.forEach((user) => graph.addUser(user));

      // A -> B, C
      // B -> D, E
      // C -> F
      // D -> G
      graph.addReferral("A", "B");
      graph.addReferral("A", "C");
      graph.addReferral("B", "D");
      graph.addReferral("B", "E");
      graph.addReferral("C", "F");
      graph.addReferral("D", "G");

      expect(analyzer.calculateTotalReach("A")).toBe(6); // B, C, D, E, F, G
      expect(analyzer.calculateTotalReach("B")).toBe(3); // D, E, G
      expect(analyzer.calculateTotalReach("C")).toBe(1); // F
      expect(analyzer.calculateTotalReach("D")).toBe(1); // G
    });

    it("should use caching for repeated calculations", () => {
      // Create simple chain
      graph.addUser("user1");
      graph.addUser("user2");
      graph.addReferral("user1", "user2");

      // First calculation
      const result1 = analyzer.calculateTotalReach("user1");

      // Second calculation should use cache
      const result2 = analyzer.calculateTotalReach("user1");

      expect(result1).toBe(result2);
      expect(result1).toBe(1);
    });

    it("should handle single user correctly", () => {
      graph.addUser("solo");
      expect(analyzer.calculateTotalReach("solo")).toBe(0);
    });

    it("should handle star topology", () => {
      // Create star: center -> [leaf1, leaf2, leaf3, leaf4]
      graph.addUser("center");
      const leaves = ["leaf1", "leaf2", "leaf3", "leaf4"];

      leaves.forEach((leaf) => {
        graph.addUser(leaf);
        graph.addReferral("center", leaf);
      });

      expect(analyzer.calculateTotalReach("center")).toBe(4);
      leaves.forEach((leaf) => {
        expect(analyzer.calculateTotalReach(leaf)).toBe(0);
      });
    });
  });

  describe("getTopReferrersByReach", () => {
    beforeEach(() => {
      // Create test network: A -> B -> C, A -> D -> E, F (isolated)
      const users = ["A", "B", "C", "D", "E", "F"];
      users.forEach((user) => graph.addUser(user));

      graph.addReferral("A", "B");
      graph.addReferral("B", "C");
      graph.addReferral("A", "D");
      graph.addReferral("D", "E");
      // F has no referrals
    });

    it("should validate k parameter", () => {
      expect(() => analyzer.getTopReferrersByReach(0)).toThrow(
        "k must be a positive integer",
      );
      expect(() => analyzer.getTopReferrersByReach(-1)).toThrow(
        "k must be a positive integer",
      );
      expect(() => analyzer.getTopReferrersByReach(1.5)).toThrow(
        "k must be a positive integer",
      );
    });

    it("should return top referrers ranked by total reach", () => {
      const topReferrers = analyzer.getTopReferrersByReach(5);

      expect(topReferrers).toHaveLength(3); // Only A, B, D have referrals
      expect(topReferrers[0]).toEqual({ userId: "A", score: 4 }); // A reaches B, C, D, E
      expect(topReferrers[1]).toEqual({ userId: "B", score: 1 }); // B reaches C
      expect(topReferrers[2]).toEqual({ userId: "D", score: 1 }); // D reaches E
    });

    it("should limit results to k when k < total referrers", () => {
      const topReferrers = analyzer.getTopReferrersByReach(2);

      expect(topReferrers).toHaveLength(2);
      expect(topReferrers[0]).toEqual({ userId: "A", score: 4 });
      expect(topReferrers[1].score).toBe(1); // Either B or D
    });

    it("should handle empty graph", () => {
      const emptyGraph = new ReferralGraph();
      const emptyAnalyzer = new NetworkAnalyzer(emptyGraph);

      const result = emptyAnalyzer.getTopReferrersByReach(5);
      expect(result).toHaveLength(0);
    });

    it("should handle graph with no referrals", () => {
      const isolatedGraph = new ReferralGraph();
      isolatedGraph.addUser("user1");
      isolatedGraph.addUser("user2");
      const isolatedAnalyzer = new NetworkAnalyzer(isolatedGraph);

      const result = isolatedAnalyzer.getTopReferrersByReach(5);
      expect(result).toHaveLength(0);
    });

    it("should handle ties in reach scores", () => {
      // Create network where B and D both have reach of 1
      const result = analyzer.getTopReferrersByReach(10);

      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({ userId: "A", score: 4 });

      // B and D should both have score 1, order doesn't matter for ties
      const tiedUsers = result.slice(1);
      expect(tiedUsers).toHaveLength(2);
      expect(tiedUsers.every((user) => user.score === 1)).toBe(true);

      const userIds = tiedUsers.map((user) => user.userId).sort();
      expect(userIds).toEqual(["B", "D"]);
    });

    it("should work with large k value", () => {
      const result = analyzer.getTopReferrersByReach(1000);
      expect(result).toHaveLength(3); // Only 3 users have referrals
    });
  });

  describe("caching behavior", () => {
    it("should clear cache when requested", () => {
      graph.addUser("user1");
      graph.addUser("user2");
      graph.addReferral("user1", "user2");

      // Calculate to populate cache
      analyzer.calculateTotalReach("user1");

      // Clear cache
      analyzer.clearCache();

      // Should still work after cache clear
      expect(analyzer.calculateTotalReach("user1")).toBe(1);
    });
  });

  describe("calculateUniqueReachExpansion", () => {
    it("should return empty array for empty graph", () => {
      const result = analyzer.calculateUniqueReachExpansion();
      expect(result).toHaveLength(0);
    });

    it("should return empty array for graph with no referrals", () => {
      graph.addUser("user1");
      graph.addUser("user2");

      const result = analyzer.calculateUniqueReachExpansion();
      expect(result).toHaveLength(0);
    });

    it("should handle simple linear chain correctly", () => {
      // Create chain: A -> B -> C -> D
      const users = ["A", "B", "C", "D"];
      users.forEach((user) => graph.addUser(user));

      graph.addReferral("A", "B");
      graph.addReferral("B", "C");
      graph.addReferral("C", "D");

      const result = analyzer.calculateUniqueReachExpansion();

      // A should be selected first (reaches B, C, D = 3 unique)
      // Then B should be selected (reaches C, D but C, D already covered = 0 unique)
      // Algorithm should stop after A since no other user adds unique reach
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({ userId: "A", score: 3 });
    });

    it("should handle tree structure with optimal selection", () => {
      // Create tree: A -> [B, C], B -> [D, E], C -> [F, G]
      const users = ["A", "B", "C", "D", "E", "F", "G"];
      users.forEach((user) => graph.addUser(user));

      graph.addReferral("A", "B");
      graph.addReferral("A", "C");
      graph.addReferral("B", "D");
      graph.addReferral("B", "E");
      graph.addReferral("C", "F");
      graph.addReferral("C", "G");

      const result = analyzer.calculateUniqueReachExpansion();

      // A should be selected first (reaches all 6 others)
      // No other user should add unique reach after A
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({ userId: "A", score: 6 });
    });

    it("should handle disconnected components correctly", () => {
      // Create two separate trees: A -> [B, C] and D -> [E, F]
      const users = ["A", "B", "C", "D", "E", "F"];
      users.forEach((user) => graph.addUser(user));

      graph.addReferral("A", "B");
      graph.addReferral("A", "C");
      graph.addReferral("D", "E");
      graph.addReferral("D", "F");

      const result = analyzer.calculateUniqueReachExpansion();

      // Should select both A and D (or D and A, order may vary for ties)
      expect(result).toHaveLength(2);

      // Both should have score of 2
      expect(result[0].score).toBe(2);
      expect(result[1].score).toBe(2);

      // Should include both A and D
      const userIds = result.map((r) => r.userId).sort();
      expect(userIds).toEqual(["A", "D"]);
    });

    it("should handle complex overlapping reach correctly", () => {
      // Create structure: A -> [B, C], B -> D, C -> E, D -> F
      // This creates overlapping reach without violating unique referrer constraint
      const users = ["A", "B", "C", "D", "E", "F"];
      users.forEach((user) => graph.addUser(user));

      graph.addReferral("A", "B");
      graph.addReferral("A", "C");
      graph.addReferral("B", "D");
      graph.addReferral("C", "E");
      graph.addReferral("D", "F");

      const result = analyzer.calculateUniqueReachExpansion();

      // A should be selected first (reaches B, C, D, E, F = 5 unique)
      // No other user should add unique reach after A
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({ userId: "A", score: 5 });
    });

    it("should handle star topology correctly", () => {
      // Create star: center -> [leaf1, leaf2, leaf3, leaf4]
      graph.addUser("center");
      const leaves = ["leaf1", "leaf2", "leaf3", "leaf4"];

      leaves.forEach((leaf) => {
        graph.addUser(leaf);
        graph.addReferral("center", leaf);
      });

      const result = analyzer.calculateUniqueReachExpansion();

      // Only center should be selected (reaches all 4 leaves)
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({ userId: "center", score: 4 });
    });

    it("should handle case where multiple users have non-overlapping reach", () => {
      // Create structure: A -> B, C -> D, E -> F (three separate chains)
      const users = ["A", "B", "C", "D", "E", "F"];
      users.forEach((user) => graph.addUser(user));

      graph.addReferral("A", "B");
      graph.addReferral("C", "D");
      graph.addReferral("E", "F");

      const result = analyzer.calculateUniqueReachExpansion();

      // All three users (A, C, E) should be selected with score 1 each
      expect(result).toHaveLength(3);

      result.forEach((rankedUser) => {
        expect(rankedUser.score).toBe(1);
      });

      const userIds = result.map((r) => r.userId).sort();
      expect(userIds).toEqual(["A", "C", "E"]);
    });

    it("should handle single user with referrals", () => {
      graph.addUser("A");
      graph.addUser("B");
      graph.addReferral("A", "B");

      const result = analyzer.calculateUniqueReachExpansion();

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({ userId: "A", score: 1 });
    });

    it("should use caching for reach sets", () => {
      // Create simple structure
      const users = ["A", "B", "C"];
      users.forEach((user) => graph.addUser(user));
      graph.addReferral("A", "B");
      graph.addReferral("B", "C");

      // First calculation should populate cache
      const result1 = analyzer.calculateUniqueReachExpansion();

      // Second calculation should use cache
      const result2 = analyzer.calculateUniqueReachExpansion();

      expect(result1).toEqual(result2);
      expect(result1).toHaveLength(1);
      expect(result1[0]).toEqual({ userId: "A", score: 2 });
    });

    it("should handle greedy selection with partial overlaps", () => {
      // Create structure where greedy selection matters:
      // A -> [B, C], B -> D, E -> [F, G], F -> H, I -> [J, K]
      // This creates separate subtrees with different sizes
      const users = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K"];
      users.forEach((user) => graph.addUser(user));

      graph.addReferral("A", "B");
      graph.addReferral("A", "C");
      graph.addReferral("B", "D");
      graph.addReferral("E", "F");
      graph.addReferral("E", "G");
      graph.addReferral("F", "H");
      graph.addReferral("I", "J");
      graph.addReferral("I", "K");

      const result = analyzer.calculateUniqueReachExpansion();

      // A should be selected first (unique reach: B, C, D = 3)
      // Then E should be selected (unique reach: F, G, H = 3)
      // Then I should be selected (unique reach: J, K = 2)
      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({ userId: "A", score: 3 });
      expect(result[1]).toEqual({ userId: "E", score: 3 });
      expect(result[2]).toEqual({ userId: "I", score: 2 });
    });
  });

  describe("calculateFlowCentrality", () => {
    it("should return empty array for empty graph", () => {
      const result = analyzer.calculateFlowCentrality();
      expect(result).toHaveLength(0);
    });

    it("should return empty array for graph with no referrals", () => {
      graph.addUser("user1");
      graph.addUser("user2");

      const result = analyzer.calculateFlowCentrality();
      expect(result).toHaveLength(0);
    });

    it("should handle simple linear chain correctly", () => {
      // Create chain: A -> B -> C -> D
      // B should have highest centrality (lies on path A->C, A->D)
      // C should have lower centrality (lies on path A->D)
      const users = ["A", "B", "C", "D"];
      users.forEach((user) => graph.addUser(user));

      graph.addReferral("A", "B");
      graph.addReferral("B", "C");
      graph.addReferral("C", "D");

      const result = analyzer.calculateFlowCentrality();

      // B lies on paths: A->C, A->D (2 paths)
      // C lies on paths: A->D, B->D (2 paths)
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ userId: "B", score: 2 });
      expect(result[1]).toEqual({ userId: "C", score: 2 });
    });

    it("should handle star topology correctly", () => {
      // Create star: center -> [leaf1, leaf2, leaf3]
      // Center should have centrality 0 (no paths pass through it)
      // Leaves should have centrality 0 (no paths pass through them)
      graph.addUser("center");
      const leaves = ["leaf1", "leaf2", "leaf3"];

      leaves.forEach((leaf) => {
        graph.addUser(leaf);
        graph.addReferral("center", leaf);
      });

      const result = analyzer.calculateFlowCentrality();

      // In a star topology, no user lies on shortest paths between other users
      expect(result).toHaveLength(0);
    });

    it("should handle branching topology correctly", () => {
      // Create branching: A -> B -> [C, D]
      // B should have centrality (lies on paths A->C, A->D)
      const users = ["A", "B", "C", "D"];
      users.forEach((user) => graph.addUser(user));

      graph.addReferral("A", "B");
      graph.addReferral("B", "C");
      graph.addReferral("B", "D");

      const result = analyzer.calculateFlowCentrality();

      // B lies on paths A->C and A->D
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({ userId: "B", score: 2 });
    });

    it("should handle bridge topology correctly", () => {
      // Create: A -> B -> C -> D -> E
      // C should have highest centrality (bridge between left and right)
      const users = ["A", "B", "C", "D", "E"];
      users.forEach((user) => graph.addUser(user));

      graph.addReferral("A", "B");
      graph.addReferral("B", "C");
      graph.addReferral("C", "D");
      graph.addReferral("D", "E");

      const result = analyzer.calculateFlowCentrality();

      // C lies on paths: A->D, A->E, B->D, B->E (4 paths)
      // B lies on paths: A->C, A->D, A->E (3 paths)
      // D lies on paths: A->E, B->E, C->E (3 paths)
      expect(result).toHaveLength(3);

      // C should have highest centrality (4), B and D should have 3 each
      const scores = result.map((r) => r.score).sort((a, b) => b - a);
      expect(scores[0]).toBe(4); // C
      expect(scores[1]).toBe(3); // B or D
      expect(scores[2]).toBe(3); // D or B
    });

    it("should handle complex network topology", () => {
      // Create more complex network:
      // A -> B -> D -> F
      // A -> C -> E -> G
      // This creates two separate subtrees
      const users = ["A", "B", "C", "D", "E", "F", "G"];
      users.forEach((user) => graph.addUser(user));

      graph.addReferral("A", "B");
      graph.addReferral("A", "C");
      graph.addReferral("B", "D");
      graph.addReferral("C", "E");
      graph.addReferral("D", "F");
      graph.addReferral("E", "G");

      const result = analyzer.calculateFlowCentrality();

      // B lies on paths: A->D, A->F (2 paths)
      // C lies on paths: A->E, A->G (2 paths)
      // D lies on paths: A->F (1 path)
      // E lies on paths: A->G (1 path)
      expect(result).toHaveLength(4);

      const userIds = result.map((r) => r.userId).sort();
      expect(userIds).toEqual(["B", "C", "D", "E"]);
    });

    it("should handle disconnected components", () => {
      // Create two separate chains: A -> B -> C and D -> E -> F
      const users = ["A", "B", "C", "D", "E", "F"];
      users.forEach((user) => graph.addUser(user));

      graph.addReferral("A", "B");
      graph.addReferral("B", "C");
      graph.addReferral("D", "E");
      graph.addReferral("E", "F");

      const result = analyzer.calculateFlowCentrality();

      // B lies on path A->C, E lies on path D->F
      expect(result).toHaveLength(2);

      // Both should have score 1
      expect(result[0].score).toBe(1);
      expect(result[1].score).toBe(1);

      const userIds = result.map((r) => r.userId).sort();
      expect(userIds).toEqual(["B", "E"]);
    });

    it("should handle single edge correctly", () => {
      graph.addUser("A");
      graph.addUser("B");
      graph.addReferral("A", "B");

      const result = analyzer.calculateFlowCentrality();

      // No intermediate nodes in a single edge
      expect(result).toHaveLength(0);
    });

    it("should use caching for shortest paths", () => {
      // Create simple structure
      const users = ["A", "B", "C"];
      users.forEach((user) => graph.addUser(user));
      graph.addReferral("A", "B");
      graph.addReferral("B", "C");

      // First calculation should populate cache
      const result1 = analyzer.calculateFlowCentrality();

      // Second calculation should use cache
      const result2 = analyzer.calculateFlowCentrality();

      expect(result1).toEqual(result2);
      expect(result1).toHaveLength(1);
      expect(result1[0]).toEqual({ userId: "B", score: 1 });
    });

    it("should handle tree with multiple branches", () => {
      // Create tree: A -> [B, C], B -> [D, E], C -> [F, G]
      const users = ["A", "B", "C", "D", "E", "F", "G"];
      users.forEach((user) => graph.addUser(user));

      graph.addReferral("A", "B");
      graph.addReferral("A", "C");
      graph.addReferral("B", "D");
      graph.addReferral("B", "E");
      graph.addReferral("C", "F");
      graph.addReferral("C", "G");

      const result = analyzer.calculateFlowCentrality();

      // B lies on paths: A->D, A->E (2 paths)
      // C lies on paths: A->F, A->G (2 paths)
      expect(result).toHaveLength(2);

      // Both B and C should have score 2
      expect(result[0].score).toBe(2);
      expect(result[1].score).toBe(2);

      const userIds = result.map((r) => r.userId).sort();
      expect(userIds).toEqual(["B", "C"]);
    });

    it("should correctly identify shortest path condition", () => {
      // Create network where shortest path condition is critical:
      // A -> B -> C
      // A -> D -> E -> F (separate longer path)
      const users = ["A", "B", "C", "D", "E", "F"];
      users.forEach((user) => graph.addUser(user));

      graph.addReferral("A", "B");
      graph.addReferral("B", "C");
      graph.addReferral("A", "D");
      graph.addReferral("D", "E");
      graph.addReferral("E", "F");

      const result = analyzer.calculateFlowCentrality();

      // B lies on path A->C (1 path)
      // D lies on paths A->E, A->F (2 paths)
      // E lies on path A->F (1 path)
      expect(result).toHaveLength(3);

      const userIds = result.map((r) => r.userId).sort();
      expect(userIds).toEqual(["B", "D", "E"]);
    });

    it("should handle large linear chain efficiently", () => {
      // Create chain of 10 users to test performance
      const chainLength = 10;
      for (let i = 0; i < chainLength; i++) {
        graph.addUser(`user${i}`);
      }

      for (let i = 0; i < chainLength - 1; i++) {
        graph.addReferral(`user${i}`, `user${i + 1}`);
      }

      const result = analyzer.calculateFlowCentrality();

      // All intermediate users should have centrality
      expect(result).toHaveLength(chainLength - 2);

      // Verify scores are in descending order
      for (let i = 0; i < result.length - 1; i++) {
        expect(result[i].score).toBeGreaterThanOrEqual(result[i + 1].score);
      }
    });
  });

  describe("edge cases", () => {
    it("should handle very deep chain", () => {
      // Create chain of 100 users
      const chainLength = 100;
      for (let i = 0; i < chainLength; i++) {
        graph.addUser(`user${i}`);
      }

      for (let i = 0; i < chainLength - 1; i++) {
        graph.addReferral(`user${i}`, `user${i + 1}`);
      }

      expect(analyzer.calculateTotalReach("user0")).toBe(chainLength - 1);
      expect(analyzer.calculateTotalReach(`user${chainLength - 1}`)).toBe(0);
    });

    it("should handle wide tree", () => {
      // Create tree with 1 root and 50 leaves
      graph.addUser("root");
      const leafCount = 50;

      for (let i = 0; i < leafCount; i++) {
        const leafId = `leaf${i}`;
        graph.addUser(leafId);
        graph.addReferral("root", leafId);
      }

      expect(analyzer.calculateTotalReach("root")).toBe(leafCount);

      const topReferrers = analyzer.getTopReferrersByReach(1);
      expect(topReferrers).toHaveLength(1);
      expect(topReferrers[0]).toEqual({ userId: "root", score: leafCount });
    });
  });
});
