import { ReferralGraph } from "../src/graph/ReferralGraph";
import { NetworkAnalyzer } from "../src/analysis/NetworkAnalyzer";

describe("Integration: Graph + Analyzer", () => {
  test("end-to-end workflow computes consistent metrics", () => {
    const graph = new ReferralGraph();
    const analyzer = new NetworkAnalyzer(graph);

    const users = ["root", "a1", "a2", "b1", "b2", "c1", "c2"];
    users.forEach((u) => graph.addUser(u));

    graph.addReferral("root", "a1");
    graph.addReferral("root", "a2");
    graph.addReferral("a1", "b1");
    graph.addReferral("a1", "b2");
    graph.addReferral("a2", "c1");
    graph.addReferral("a2", "c2");

    // Reach
    expect(analyzer.calculateTotalReach("root")).toBe(6);
    expect(analyzer.calculateTotalReach("a1")).toBe(2);
    expect(analyzer.calculateTotalReach("a2")).toBe(2);

    // Top referrers by reach
    const top = analyzer.getTopReferrersByReach(3);
    expect(top[0]).toEqual({ userId: "root", score: 6 });

    // Flow centrality - middle layer nodes should have positive centrality
    const centrality = analyzer.calculateFlowCentrality();
    const ids = centrality.map((r) => r.userId);
    expect(ids).toEqual(expect.arrayContaining(["a1", "a2"]));
  });

  test("cache usage remains correct across changes when manually cleared", () => {
    const graph = new ReferralGraph();
    const analyzer = new NetworkAnalyzer(graph);

    graph.addUser("A");
    graph.addUser("B");
    graph.addReferral("A", "B");

    // Warm cache
    expect(analyzer.calculateTotalReach("A")).toBe(1);

    // Change graph
    graph.addUser("C");
    graph.addReferral("B", "C");

    // Without clearing cache, result may be stale by design
    // After clearing, it should reflect the update
    analyzer.clearCache();
    expect(analyzer.calculateTotalReach("A")).toBe(2);
  });
});
