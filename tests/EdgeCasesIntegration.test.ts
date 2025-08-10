import { ReferralGraph } from "../src/graph/ReferralGraph";
import { NetworkAnalyzer } from "../src/analysis/NetworkAnalyzer";
import { NetworkSimulator } from "../src/simulation/NetworkSimulator";

describe("Edge cases across components", () => {
  test("empty graph works with analyzer", () => {
    const graph = new ReferralGraph();
    const analyzer = new NetworkAnalyzer(graph);

    expect(analyzer.calculateTotalReach("unknown")).toBe(0);
    expect(analyzer.getTopReferrersByReach(5)).toEqual([]);
    expect(analyzer.calculateFlowCentrality()).toEqual([]);
  });

  test("single user graph", () => {
    const graph = new ReferralGraph();
    graph.addUser("solo");
    const analyzer = new NetworkAnalyzer(graph);

    expect(analyzer.calculateTotalReach("solo")).toBe(0);
    expect(analyzer.getTopReferrersByReach(5)).toEqual([]);
  });

  test("simulator daysToTarget integrates with analyzer assumptions", () => {
    const simulator = new NetworkSimulator();
    // probability 0 cannot reach target
    expect(simulator.daysToTarget(0, 10)).toBe(-1);
    // small probability and small target should be achievable in reasonable days
    const days = simulator.daysToTarget(0.1, 10);
    expect(days).toBeGreaterThan(0);
  });
});
