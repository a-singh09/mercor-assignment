import { BonusOptimizer } from "../src";
import { ConsoleLogger } from "../src/utils/Logger";

const optimizer = new BonusOptimizer(undefined, new ConsoleLogger("info"));

// Monotone adoption probability functions
const linear = (b: number) => Math.min(1, b / 200);
const sigmoid = (b: number) => {
  const x = (b - 50) / 20;
  const p = 1 / (1 + Math.exp(-x));
  return Math.min(1, Math.max(0, p));
};

const days = 7;
const target = 250;

const r1 = optimizer.minBonusForTarget(days, target, linear, 0.01);
console.log(`Linear adoption -> min bonus for ${target} in ${days} days:`, r1);

const r2 = optimizer.minBonusForTarget(days, target, sigmoid, 0.01);
console.log(`Sigmoid adoption -> min bonus for ${target} in ${days} days:`, r2);
