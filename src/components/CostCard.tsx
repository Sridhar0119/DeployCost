import { Server, Cloud, Database, Activity, Award } from 'lucide-react';

interface CostBreakdown {
  baseCost: number;
  storageCost: number;
  bandwidthCost: number;
  totalCost: number;
}

interface CostCardProps {
  platform: 'AWS' | 'Azure' | 'GCP' | 'DigitalOcean';
  data: CostBreakdown | null;
  isCheapest: boolean;
}

const PLATFORM_ICONS = {
  AWS: Cloud,
  Azure: Server,
  GCP: Cloud,
  DigitalOcean: Database,
};

const PLATFORM_COLORS = {
  AWS: 'text-[#BA7517] bg-[#BA7517]/10',
  Azure: 'text-blue-600 bg-blue-50',
  GCP: 'text-purple bg-purple/10',
  DigitalOcean: 'text-[#1D9E75] bg-[#1D9E75]/10',
};

export default function CostCard({ platform, data, isCheapest }: CostCardProps) {
  const Icon = PLATFORM_ICONS[platform] || Cloud;
  const colorClasses = PLATFORM_COLORS[platform] || 'text-gray-500 bg-gray-50';

  if (!data) {
    return (
      <div 
        id={`cost-card-${platform.toLowerCase()}`}
        className="bg-white border border-[#d8d5cb] rounded-lg p-5 flex flex-col justify-between h-[210px] animate-pulse"
      >
        <div className="flex justify-between items-start">
          <div className="w-12 h-12 rounded-lg bg-gray-150" />
          <div className="w-20 h-5 bg-gray-150 rounded" />
        </div>
        <div className="space-y-2">
          <div className="h-8 bg-gray-150 rounded w-1/2" />
          <div className="h-4 bg-gray-150 rounded w-3/4" />
        </div>
      </div>
    );
  }

  return (
    <div
      id={`cost-card-${platform.toLowerCase()}`}
      className={`rounded-lg p-5 flex flex-col justify-between h-[230px] transition-all relative ${
        isCheapest
          ? 'border-[1.5px] border-[#1D9E75] bg-[#1D9E75]/5 shadow-sm'
          : 'border-[0.5px] border-[#d8d5cb] bg-white'
      }`}
    >
      {/* Cheapest Winner Badge */}
      {isCheapest && (
        <span 
          id={`winner-badge-${platform.toLowerCase()}`}
          className="absolute -top-3 right-4 flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-sans font-bold tracking-wider uppercase bg-[#1D9E75] text-white shadow-xs"
        >
          <Award className="w-3 h-3" />
          <span>Cheapest Choice</span>
        </span>
      )}

      {/* Header */}
      <div className="flex justify-between items-start">
        <div className={`p-3 rounded-lg ${colorClasses}`}>
          <Icon className="w-6 h-6 shrink-0" />
        </div>
        <span className="font-mono text-xs font-semibold uppercase text-gray-400 tracking-wider">
          {platform}
        </span>
      </div>

      {/* Pricing display */}
      <div className="my-3">
        <div className="flex items-baseline space-x-1">
          <span className="font-sans font-extrabold text-3xl text-[#2C2C2A]">
            ${data.totalCost.toFixed(2)}
          </span>
          <span className="font-sans text-xs text-gray-400">/mo</span>
        </div>
        <p className="font-sans text-[11px] text-gray-500 mt-1">
          Estimated annual cost: ${(data.totalCost * 12).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </p>
      </div>

      {/* Breakdowns */}
      <div className="border-t border-[#d8d5cb]/50 pt-2.5 space-y-1.5">
        <div className="flex justify-between text-[11px] font-mono text-gray-500">
          <span className="flex items-center gap-1">
            <Activity className="w-3 h-3 text-gray-400" />
            Compute:
          </span>
          <span className="font-semibold">${data.baseCost.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-[11px] font-mono text-gray-500">
          <span className="flex items-center gap-1">
            <Database className="w-3 h-3 text-gray-400" />
            Storage:
          </span>
          <span className="font-semibold">${data.storageCost.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-[11px] font-mono text-gray-500">
          <span className="flex items-center gap-1">
            <Cloud className="w-3 h-3 text-gray-400" />
            Bandwidth:
          </span>
          <span className="font-semibold">${data.bandwidthCost.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
}
