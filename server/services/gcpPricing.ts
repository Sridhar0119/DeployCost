import { Specs } from './awsPricing';

export function estimateGCP(specs: Specs): { baseCost: number; storageCost: number; bandwidthCost: number; totalCost: number } {
  const cpuCost = specs.cpu * 3.20;
  const ramCost = specs.ram * 0.75;
  const storageCost = specs.storage * 0.017;
  const bandwidthCost = specs.bandwidth * 0.085;

  const baseCost = cpuCost + ramCost;
  const totalCost = (baseCost + storageCost + bandwidthCost) * 0.92;

  return {
    baseCost,
    storageCost,
    bandwidthCost,
    totalCost: parseFloat(totalCost.toFixed(2)),
  };
}
