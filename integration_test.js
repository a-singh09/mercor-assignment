const { ReferralGraph, NetworkAnalyzer } = require("./dist/index.js");

// Create a test network
const graph = new ReferralGraph();
const analyzer = new NetworkAnalyzer(graph);

// Add users
["A", "B", "C", "D", "E"].forEach((user) => graph.addUser(user));

// Create referral relationships: A -> B -> C, A -> D -> E
graph.addReferral("A", "B");
graph.addReferral("B", "C");
graph.addReferral("A", "D");
graph.addReferral("D", "E");

// Test total reach calculation
console.log("Total reach for A:", analyzer.calculateTotalReach("A")); // Should be 4
console.log("Total reach for B:", analyzer.calculateTotalReach("B")); // Should be 1
console.log("Total reach for D:", analyzer.calculateTotalReach("D")); // Should be 1

// Test top referrers
const topReferrers = analyzer.getTopReferrersByReach(3);
console.log("Top referrers:", topReferrers);

console.log("Integration test completed successfully!");
