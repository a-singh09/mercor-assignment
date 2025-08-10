import { ReferralGraph } from "../src/graph/ReferralGraph";
import { NetworkAnalyzer } from "../src/analysis/NetworkAnalyzer";

// These are light-weight performance sanity checks, not microbenchmarks
jest.setTimeout(20000);

describe("Performance and scalability sanity checks", () => {
  test("handles 1K users with sparse referrals quickly", () => {
    const graph = new ReferralGraph();
    for (let i = 0; i < 1000; i++) graph.addUser(`u${i}`);
    for (let i = 0; i < 1000; i += 2) {
      if (i + 1 < 1000) graph.addReferral(`u${i}`, `u${i + 1}`);
    }

    const analyzer = new NetworkAnalyzer(graph);
    const start = Date.now();
    const top = analyzer.getTopReferrersByReach(10);
    const elapsed = Date.now() - start;

    expect(top.length).toBeGreaterThan(0);
    expect(elapsed).toBeLessThan(1000);
  });

  test("builds 10K-node graph with minimal operations", () => {
    const graph = new ReferralGraph();
    for (let i = 0; i < 10000; i++) graph.addUser(`n${i}`);
    // Add sparse chain
    for (let i = 0; i < 10000 - 1; i += 100) {
      graph.addReferral(`n${i}`, `n${i + 1}`);
    }
    // Ensure basic queries are fast
    expect(graph.getAllUsers().length).toBe(10000);
    expect(Array.isArray(graph.getDirectReferrals("n0"))).toBe(true);
  });

  test("constructs 100K users quickly with no edges (smoke)", () => {
    const graph = new ReferralGraph();
    for (let i = 0; i < 100000; i++) graph.addUser(`x${i}`);
    // Only cheap checks
    expect(graph.getAllUsers().length).toBe(100000);
  });
});
