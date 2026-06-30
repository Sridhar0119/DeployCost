import { Sparkles, TrendingDown, Lightbulb, Minimize2 } from 'lucide-react';

interface SavingsTipsProps {
  specs: {
    cpu: number;
    ram: number;
    storage: number;
    bandwidth: number;
  };
  results: {
    aws: number;
    azure: number;
    gcp: number;
    do: number;
    cheapestName: string;
  } | null;
}

export default function SavingsTips({ specs, results }: SavingsTipsProps) {
  if (!results) {
    return (
      <div className="bg-white border border-[#d8d5cb] rounded-lg p-6 animate-pulse">
        <span className="font-sans text-xs text-gray-400">Evaluating savings opportunities...</span>
      </div>
    );
  }

  const platforms = [
    { name: 'AWS', cost: results.aws },
    { name: 'Azure', cost: results.azure },
    { name: 'GCP', cost: results.gcp },
    { name: 'DigitalOcean', cost: results.do },
  ];

  platforms.sort((a, b) => a.cost - b.cost);
  const cheapest = platforms[0];
  const mostExpensive = platforms[platforms.length - 1];
  const diff = mostExpensive.cost - cheapest.cost;
  const pctSavings = mostExpensive.cost > 0 ? (diff / mostExpensive.cost) * 100 : 0;

  // Derive dynamic savings tips
  const tips = [
    {
      id: 'tip-provider',
      icon: TrendingDown,
      color: 'bg-[#1D9E75]/10 text-[#1D9E75]',
      title: `Switching to ${cheapest.name} Saves ${pctSavings.toFixed(0)}%`,
      desc: `By deploying your configuration on ${cheapest.name} instead of ${mostExpensive.name}, you immediately save $${diff.toFixed(2)} every single month ($${(diff * 12).toFixed(2)} annually) with zero architecture edits.`,
    },
  ];

  // Tailored Tip 2: RAM Downsizing
  if (specs.ram > 4) {
    const halfRam = Math.floor(specs.ram / 2);
    const potentialSavings = (specs.ram - halfRam) * 0.80; // Estimated $0.80 per GB saved
    tips.push({
      id: 'tip-ram',
      icon: Minimize2,
      color: 'bg-[#534AB7]/10 text-[#534AB7]',
      title: `Downsize RAM to ${halfRam} GB`,
      desc: `Your current application RAM allocation of ${specs.ram} GB is high. If your application baseline usage is lower, reducing RAM limits to ${halfRam} GB can shave up to $${potentialSavings.toFixed(2)}/mo off your compute baseline.`,
    });
  } else {
    tips.push({
      id: 'tip-storage',
      icon: Lightbulb,
      color: 'bg-[#BA7517]/10 text-[#BA7517]',
      title: `Use Object Storage for Assets`,
      desc: `Instead of allocating ${specs.storage} GB of SSD block storage directly, offload static images and static media uploads to object storage buckets (like AWS S3) to lower your active disk footprint by up to 80%.`,
    });
  }

  // Tailored Tip 3: General bandwidth optimization
  if (specs.bandwidth > 100) {
    tips.push({
      id: 'tip-bandwidth',
      icon: Sparkles,
      color: 'bg-blue-50 text-blue-600',
      title: 'Deploy a Content Delivery Network (CDN)',
      desc: `At ${specs.bandwidth} GB/mo of egress, caching your static routes behind a CDN can reduce egress data transfers on AWS/Azure by up to 65%, bringing down raw bandwidth transit billings.`,
    });
  } else {
    tips.push({
      id: 'tip-reserved',
      icon: Sparkles,
      color: 'bg-indigo-50 text-indigo-600',
      title: 'Leverage 1-Year Committed Use Discounts',
      desc: `If you expect your deploy baseline to remain stable for 12 months, opting for committed use instances on GCP/AWS saves you an additional 25% to 35% on standard on-demand compute rates.`,
    });
  }

  return (
    <div id="savings-tips-container" className="bg-white border border-[#d8d5cb] rounded-lg p-6 space-y-5">
      <div>
        <h3 className="font-sans font-bold text-[#2C2C2A] text-sm flex items-center space-x-1.5">
          <Sparkles className="w-4 h-4 text-[#BA7517] animate-spin" />
          <span>Dynamic Savings Opportunities</span>
        </h3>
        <p className="font-sans text-xs text-gray-500 mt-0.5">
          AI-generated architectural suggestions based on your currently selected specs.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {tips.map((tip) => {
          const Icon = tip.icon;
          return (
            <div 
              key={tip.id} 
              id={tip.id}
              className="border border-[#d8d5cb]/60 rounded-lg p-4 bg-[#F1EFE8]/20 flex flex-col justify-between"
            >
              <div>
                <div className={`p-2 rounded-lg w-fit ${tip.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <h4 className="font-sans font-bold text-[#2C2C2A] text-xs mt-3 leading-tight">
                  {tip.title}
                </h4>
                <p className="font-sans text-[11px] text-gray-500 mt-1.5 leading-relaxed">
                  {tip.desc}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
