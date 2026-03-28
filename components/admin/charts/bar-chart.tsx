'use client';

import {
  ResponsiveContainer,
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from 'recharts';

interface BarChartProps {
  data: Record<string, unknown>[];
  dataKey: string;
  xAxisKey: string;
  color?: string;
  colors?: string[];
  formatValue?: (value: number) => string;
  formatXAxis?: (value: string) => string;
  height?: number;
  layout?: 'horizontal' | 'vertical';
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

export function AdminBarChart({
  data,
  dataKey,
  xAxisKey,
  color = '#a2dd00',
  colors,
  formatValue,
  formatXAxis,
  height = 280,
}: BarChartProps) {
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
        <RechartsBarChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
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
          <Bar dataKey={dataKey} radius={[4, 4, 0, 0]}>
            {colors
              ? data.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)
              : data.map((_, i) => <Cell key={i} fill={color} />)}
          </Bar>
        </RechartsBarChart>
      </ResponsiveContainer>
    </div>
  );
}
