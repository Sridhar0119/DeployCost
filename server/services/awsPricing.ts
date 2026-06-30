export interface Specs {
  cpu: number;
  ram: number;
  storage: number;
  bandwidth: number;
}

export function estimateAWS(specs: Specs): { baseCost: number; storageCost: number; bandwidthCost: number; totalCost: number } {
  const cpuCost = specs.cpu * 3.50;
  const ramCost = specs.ram * 0.80;
  const storageCost = specs.storage * 0.023;
  const bandwidthCost = specs.bandwidth * 0.09;
  
  const baseCost = cpuCost + ramCost;
  const totalCost = (baseCost + storageCost + bandwidthCost) * 1.0;

  return {
    baseCost,
    storageCost,
    bandwidthCost,
    totalCost: parseFloat(totalCost.toFixed(2)),
  };
}
