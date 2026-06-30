import { Specs } from './awsPricing';

// Standard Droplet pricing tiers: (CPU-RAM_in_GB) -> Base price in USD
const DROPLET_TIERS: Record<string, number> = {
  '1-1': 6.00,
  '1-2': 12.00,
  '2-2': 18.00,
  '2-4': 24.00,
  '4-8': 48.00,
  '8-16': 96.00,
  '16-32': 192.00,
  '32-64': 384.00,
};

export function estimateDO(specs: Specs): { baseCost: number; storageCost: number; bandwidthCost: number; totalCost: number } {
  const key = `${specs.cpu}-${specs.ram}`;
  
  let baseCost = 0;
  if (DROPLET_TIERS[key] !== undefined) {
    baseCost = DROPLET_TIERS[key];
  } else {
    // Fallback CPU and RAM formula
    baseCost = (specs.cpu * 3.00) + (specs.ram * 0.70);
  }

  const storageCost = specs.storage * 0.010;
  const bandwidthCost = specs.bandwidth * 0.050;

  const totalCost = baseCost + storageCost + bandwidthCost;

  return {
    baseCost,
    storageCost,
    bandwidthCost,
    totalCost: parseFloat(totalCost.toFixed(2)),
  };
}
