import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

interface CostChartProps {
  data: {
    aws: number;
    azure: number;
    gcp: number;
    do: number;
    cheapestName: string;
  } | null;
}

export default function CostChart({ data }: CostChartProps) {
  if (!data) {
    return (
      <div className="bg-white border border-[#d8d5cb] rounded-lg p-6 h-[300px] flex items-center justify-center animate-pulse">
        <span className="font-sans text-xs text-gray-400">Loading cost comparison chart...</span>
      </div>
    );
  }

  const chartData = [
    { name: 'AWS', cost: data.aws, fill: '#534AB7' },
    { name: 'Azure', cost: data.azure, fill: '#534AB7' },
    { name: 'GCP', cost: data.gcp, fill: '#534AB7' },
    { name: 'DigitalOcean', cost: data.do, fill: '#534AB7' },
  ].map((item) => {
    // Override color of the cheapest platform with brand teal
    const isCheapest = item.name.toLowerCase() === data.cheapestName.toLowerCase() || 
      (item.name === 'DigitalOcean' && data.cheapestName === 'DigitalOcean');
    return {
      ...item,
      fill: isCheapest ? '#1D9E75' : '#534AB7',
    };
  });

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white border border-[#d8d5cb] p-3 rounded-lg shadow-md font-sans">
          <p className="text-xs font-semibold text-[#2C2C2A]">{payload[0].name}</p>
          <p className="text-sm font-bold text-[#534AB7] mt-1">
            ${payload[0].value.toFixed(2)}/mo
          </p>
          <p className="text-[10px] text-gray-400 mt-0.5">
            ${(payload[0].value * 12).toLocaleString(undefined, { maximumFractionDigits: 2 })}/yr
          </p>
        </div>
      );
    };
    return null;
  };

  return (
    <div id="cost-chart-container" className="bg-white border border-[#d8d5cb] rounded-lg p-6 flex flex-col justify-between">
      <div>
        <h3 className="font-sans font-bold text-[#2C2C2A] text-sm">Monthly Price Comparison</h3>
        <p className="font-sans text-xs text-gray-500 mt-0.5">
          Side-by-side comparison of active subscription rates in USD.
        </p>
      </div>

      <div className="h-[230px] w-full mt-6">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f1efe8" />
            <XAxis 
              dataKey="name" 
              stroke="#2C2C2A" 
              fontSize={11} 
              tickLine={false}
              axisLine={{ stroke: '#d8d5cb' }}
            />
            <YAxis 
              stroke="#2C2C2A" 
              fontSize={10} 
              tickFormatter={(value) => `$${value}`}
              tickLine={false}
              axisLine={{ stroke: '#d8d5cb' }}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: '#F1EFE8', opacity: 0.4 }} />
            <Bar 
              dataKey="cost" 
              radius={[4, 4, 0, 0]}
              maxBarSize={50}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
