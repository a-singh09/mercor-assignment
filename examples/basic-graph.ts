import { ReferralGraph, NetworkAnalyzer } from "../src";
import { ConsoleLogger } from "../src/utils/Logger";

const logger = new ConsoleLogger("info");
const graph = new ReferralGraph(logger);

const users = ["root", "a1", "a2", "b1", "b2", "c1", "c2"];
users.forEach((u) => graph.addUser(u));

graph.addReferral("root", "a1");
graph.addReferral("root", "a2");
graph.addReferral("a1", "b1");
graph.addReferral("a1", "b2");
graph.addReferral("a2", "c1");
graph.addReferral("a2", "c2");

const analyzer = new NetworkAnalyzer(graph, logger);

console.log("Total reach of root:", analyzer.calculateTotalReach("root"));
console.log("Top 3 by reach:", analyzer.getTopReferrersByReach(3));
console.log(
  "Unique reach expansion ranking:",
  analyzer.calculateUniqueReachExpansion(),
);
console.log("Flow centrality ranking:", analyzer.calculateFlowCentrality());
