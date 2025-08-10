import { ReferralGraph } from "../src/graph/ReferralGraph";

function generateRandomDag(
  graph: ReferralGraph,
  numNodes: number,
  edgeAttempts: number,
) {
  const ids = Array.from({ length: numNodes }, (_, i) => `u${i}`);
  ids.forEach((id) => graph.addUser(id));

  for (let i = 0; i < edgeAttempts; i++) {
    const a = Math.floor(Math.random() * numNodes);
    const b = Math.floor(Math.random() * numNodes);
    const referrer = `u${a}`;
    const candidate = `u${b}`;
    if (referrer === candidate) continue;

    // Only add if acyclic and candidate has no referrer
    if (
      graph.hasUser(referrer) &&
      graph.hasUser(candidate) &&
      graph.getReferrer(candidate) === undefined &&
      graph.validateAcyclicity(referrer, candidate)
    ) {
      graph.addReferral(referrer, candidate);
    }
  }

  return ids;
}

function hasCycle(graph: ReferralGraph, ids: string[]): boolean {
  const visiting = new Set<string>();
  const visited = new Set<string>();

  const dfs = (u: string): boolean => {
    visiting.add(u);
    const children = graph.getDirectReferrals(u);
    for (const v of children) {
      if (visiting.has(v)) return true;
      if (!visited.has(v)) {
        if (dfs(v)) return true;
      }
    }
    visiting.delete(u);
    visited.add(u);
    return false;
  };

  for (const id of ids) {
    if (!visited.has(id)) {
      if (dfs(id)) return true;
    }
  }
  return false;
}

describe("Property-based-like randomized graph invariants", () => {
  test("random DAGs have no cycles and single referrer per node", () => {
    for (let trial = 0; trial < 10; trial++) {
      const graph = new ReferralGraph();
      const ids = generateRandomDag(graph, 50, 200);

      // Invariant: no cycles
      expect(hasCycle(graph, ids)).toBe(false);

      // Invariant: each node has at most one referrer
      for (const id of ids) {
        const referrer = graph.getReferrer(id);
        if (referrer !== undefined) {
          // Check no other referrer exists by trying to add another should throw
          const other = ids.find((x) => x !== referrer && x !== id);
          if (other) {
            expect(() => graph.addReferral(other, id)).toThrow();
          }
        }
      }
    }
  });
});
