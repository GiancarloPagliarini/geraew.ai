'use client';

import {
  ResponsiveContainer,
  AreaChart as RechartsAreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';

interface AreaChartProps {
  data: Record<string, unknown>[];
  dataKey: string;
  xAxisKey: string;
  color?: string;
  formatValue?: (value: number) => string;
  formatXAxis?: (value: string) => string;
  height?: number;
}

function ChartTooltipContent({
  active,
  payload,
  label,
  formatValue,
}: {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
  formatValue?: (value: number) => string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-[#f3f0ed]/10 bg-[#1a1f22] px-3 py-2 shadow-xl">
      <p className="text-[10px] text-[#f3f0ed]/50">{label}</p>
      <p className="text-sm font-bold text-[#f3f0ed]">
        {formatValue ? formatValue(payload[0].value) : payload[0].value.toLocaleString('pt-BR')}
      </p>
    </div>
  );
}

export function AdminAreaChart({
  data,
  dataKey,
  xAxisKey,
  color = '#a2dd00',
  formatValue,
  formatXAxis,
  height = 280,
}: AreaChartProps) {
  if (!data.length) {
    return (
      <div className="flex items-center justify-center rounded-2xl border border-[#f3f0ed]/6 bg-[#f3f0ed]/[0.02]" style={{ height }}>
        <span className="text-sm text-[#f3f0ed]/30">Sem dados</span>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-[#f3f0ed]/6 bg-[#f3f0ed]/[0.02] p-4">
      <ResponsiveContainer width="100%" height={height}>
        <RechartsAreaChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id={`gradient-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.15} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#f3f0ed" strokeOpacity={0.05} vertical={false} />
          <XAxis
            dataKey={xAxisKey}
            tickFormatter={formatXAxis}
            tick={{ fill: '#f3f0ed', opacity: 0.3, fontSize: 10 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: '#f3f0ed', opacity: 0.3, fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => (formatValue ? formatValue(v) : v.toLocaleString('pt-BR'))}
          />
          <Tooltip content={<ChartTooltipContent formatValue={formatValue} />} />
          <Area
            type="monotone"
            dataKey={dataKey}
            stroke={color}
            strokeWidth={2}
            fill={`url(#gradient-${dataKey})`}
          />
        </RechartsAreaChart>
      </ResponsiveContainer>
    </div>
  );
}
