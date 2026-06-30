import { Specs } from './awsPricing';

export function estimateAzure(specs: Specs): { baseCost: number; storageCost: number; bandwidthCost: number; totalCost: number } {
  const cpuCost = specs.cpu * 3.80;
  const ramCost = specs.ram * 0.90;
  const storageCost = specs.storage * 0.019;
  const bandwidthCost = specs.bandwidth * 0.087;

  const baseCost = cpuCost + ramCost;
  const totalCost = (baseCost + storageCost + bandwidthCost) * 1.10;

  return {
    baseCost,
    storageCost,
    bandwidthCost,
    totalCost: parseFloat(totalCost.toFixed(2)),
  };
}
