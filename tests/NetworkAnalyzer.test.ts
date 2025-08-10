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
