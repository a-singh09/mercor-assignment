import { NetworkAnalyzer } from "../src/analysis/NetworkAnalyzer";
import { ReferralGraph } from "../src/graph/ReferralGraph";
import { NetworkSimulator } from "../src/simulation/NetworkSimulator";
import { BonusOptimizer } from "../src/optimization/BonusOptimizer";
import { ReferralError, ReferralNetworkError } from "../src/types/errors";

describe("Error Handling and Validation", () => {
  test("NetworkAnalyzer.getTopReferrersByReach validates k", () => {
    const graph = new ReferralGraph();
    const analyzer = new NetworkAnalyzer(graph);
    expect(() => analyzer.getTopReferrersByReach(0)).toThrow(
      ReferralNetworkError,
    );
    expect(() => analyzer.getTopReferrersByReach(0)).toThrow(
      ReferralError.INVALID_PARAMETER,
    );
  });

  test("NetworkSimulator.simulate validates inputs", () => {
    const sim = new NetworkSimulator();
    expect(() => sim.simulate(0.5, 0)).toThrow(ReferralNetworkError);
    expect(() => sim.simulate(1.5, 1)).toThrow(
      ReferralError.INVALID_PROBABILITY,
    );
  });

  test("NetworkSimulator.daysToTarget validates probability", () => {
    const sim = new NetworkSimulator();
    expect(() => sim.daysToTarget(-0.1, 10)).toThrow(ReferralNetworkError);
    expect(() => sim.daysToTarget(-0.1, 10)).toThrow(
      ReferralError.INVALID_PROBABILITY,
    );
  });

  test("BonusOptimizer input validation", () => {
    const optimizer = new BonusOptimizer();
    const f = (b: number) => Math.min(1, b / 100);
    expect(() => optimizer.minBonusForTarget(0, 10, f, 0.1)).toThrow(
      ReferralNetworkError,
    );
    expect(() => optimizer.minBonusForTarget(1, -1, f, 0.1)).toThrow(
      ReferralError.INVALID_PARAMETER,
    );
    // invalid adoptionProb type
    expect(() => optimizer.minBonusForTarget(1, 10, null as any, 0.1)).toThrow(
      ReferralError.INVALID_PARAMETER,
    );
  });
});
