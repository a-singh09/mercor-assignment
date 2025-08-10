import { NetworkSimulator } from "../src";
import { ConsoleLogger } from "../src/utils/Logger";

const logger = new ConsoleLogger("info");
const simulator = new NetworkSimulator(logger);

const p = 0.5;
const days = 12;

const curve = simulator.simulate(p, days);
console.log(`Cumulative expected referrals over ${days} days @ p=${p}:`);
console.log(curve);

console.log("Days to 150 at p=1.0:", simulator.daysToTarget(1.0, 150));
console.log("Days to 250 at p=0.5:", simulator.daysToTarget(0.5, 250));
