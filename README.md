# Referral Network System

A TypeScript library for building and analyzing referral networks with:

- Core acyclic referral graph
- Network analytics (total reach, unique reach expansion, flow centrality)
- Growth simulation (expected-value model)
- Bonus optimization via binary search

## Installation

```bash
npm install
npm run build
```

- Run tests:

```bash
npm test
```

- Develop with TypeScript directly:

```bash
npx ts-node examples/basic-graph.ts
```

## Quick Start

```ts
import { ReferralGraph, NetworkAnalyzer } from "./src";

const graph = new ReferralGraph();
["root", "a", "b", "c"].forEach((id) => graph.addUser(id));

graph.addReferral("root", "a");
graph.addReferral("a", "b");
graph.addReferral("a", "c");

const analyzer = new NetworkAnalyzer(graph);
console.log("root reach:", analyzer.calculateTotalReach("root")); // 3
console.log("top by reach:", analyzer.getTopReferrersByReach(2));
```

### Simulation

```ts
import { NetworkSimulator } from "./src";

const sim = new NetworkSimulator();
const cumulative = sim.simulate(0.5, 10);
console.log(cumulative);
console.log("days to 150 at p=1.0:", sim.daysToTarget(1.0, 150));
```

### Bonus Optimization

```ts
import { BonusOptimizer } from "./src";

const optimizer = new BonusOptimizer();
const adoptionProb = (bonus: number) => Math.min(1, bonus / 200); // monotone
const minBonus = optimizer.minBonusForTarget(7, 250, adoptionProb, 0.01);
console.log("Min bonus:", minBonus); // rounded up to nearest $10
```

## Examples

- `examples/basic-graph.ts`: Build a graph and compute all metrics
- `examples/simulation.ts`: Run growth simulations and query days-to-target
- `examples/bonus-optimization.ts`: Find minimum bonus for a target

Run with:

```bash
npx ts-node examples/basic-graph.ts
npx ts-node examples/simulation.ts
npx ts-node examples/bonus-optimization.ts
```

## API Overview

- `ReferralGraph`

  - `addUser(userId: string): boolean`
  - `addReferral(referrerId: string, candidateId: string): boolean` (acyclicity enforced)
  - `getDirectReferrals(userId: string): string[]`
  - `getReferrer(userId: string): string | undefined`
  - `getAllUsers(): string[]`
  - `validateAcyclicity(referrerId: string, candidateId: string): boolean`

- `NetworkAnalyzer`

  - `calculateTotalReach(userId: string): number`
  - `getTopReferrersByReach(k: number): RankedUser[]`
  - `calculateUniqueReachExpansion(): RankedUser[]`
  - `calculateFlowCentrality(): RankedUser[]`
  - `clearCache(): void`

- `NetworkSimulator`

  - `simulate(probability: number, days: number): number[]`
  - `daysToTarget(probability: number, target: number): number`
  - `getInitialState(): SimulationState`
  - `getInitialReferrersCount(): number` (static)
  - `getReferralCapacity(): number` (static)

- `BonusOptimizer`
  - `minBonusForTarget(days: number, targetHires: number, adoptionProb: (bonus: number) => number, eps: number): number | null`

### Logging

All classes accept an optional `Logger`. A built-in `ConsoleLogger` supports log levels: `"debug" | "info" | "warn" | "error" | "none"`.

```ts
import { ReferralGraph } from "./src/graph/ReferralGraph";
import { ConsoleLogger } from "./src/utils/Logger";

const graph = new ReferralGraph(new ConsoleLogger("info"));
```

## Time & Space Complexity (high level)

- ReferralGraph

  - `addUser`: O(1)
  - `addReferral`: O(V + E) worst-case (DFS acyclicity check)
  - `getDirectReferrals`: O(d) to materialize array from a set of out-degree d
  - `getReferrer`: O(1)
  - `getAllUsers`: O(V)

- NetworkAnalyzer

  - `calculateTotalReach`: O(V + E) BFS; cached per user
  - `getTopReferrersByReach`: O(V\*(V+E)) to compute all reaches + O(V log V) sort
  - `calculateUniqueReachExpansion`: precompute reach sets O(V\*(V+E)); greedy selection up to O(V^2) set ops
  - `calculateFlowCentrality`: All-pairs shortest paths via BFS O(V\*(V+E)); centrality counting ~O(V^3)

- NetworkSimulator

  - `simulate`: O(D \* R_d)` where D is days and R_d is active referrers per day (bounded by 100)
  - `daysToTarget`: proportional to days needed until target or exhaustion

- BonusOptimizer
  - Exponential search (≤ 32 expansions) + binary search (≤ 1024 iters). Each iteration invokes `daysToTarget`.

## Metric Comparison

- Total Reach: counts direct + indirect referrals downstream. Good for breadth of influence.
- Unique Reach Expansion: greedy selection of users maximizing new, not-yet-covered reach. Good for targeted campaigns without overlap.
- Flow Centrality: counts how often a user lies on shortest paths between others. Good for identifying bridge/bottleneck nodes.

### Acknowledgment of AI tools

This project used Cursor and ChatGPT to accelerate development for non-critical tasks like drafting documentation, suggesting test scaffolds, and brainstorming algorithmic structures. All core logic, constraints, and final implementations were authored, reviewed, and validated by me.
