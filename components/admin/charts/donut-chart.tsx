'use client';

import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';

interface DonutChartProps {
  data: { name: string; value: number; color: string }[];
  height?: number;
}

function DonutTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { name: string; value: number; payload: { color: string } }[];
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-[#f3f0ed]/10 bg-[#1a1f22] px-3 py-2 shadow-xl">
      <p className="text-[10px] text-[#f3f0ed]/50">{payload[0].name}</p>
      <p className="text-sm font-bold text-[#f3f0ed]">{payload[0].value.toLocaleString('pt-BR')}</p>
    </div>
  );
}

export function AdminDonutChart({ data, height = 220 }: DonutChartProps) {
  const total = data.reduce((acc, d) => acc + d.value, 0);

  if (total === 0) {
    return (
      <div className="flex items-center justify-center rounded-2xl border border-[#f3f0ed]/6 bg-[#f3f0ed]/[0.02]" style={{ height }}>
        <span className="text-sm text-[#f3f0ed]/30">Sem dados</span>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-[#f3f0ed]/6 bg-[#f3f0ed]/[0.02] p-4">
      <div className="flex items-center gap-6">
        <div style={{ width: height, height }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius="60%"
                outerRadius="85%"
                paddingAngle={2}
                dataKey="value"
                stroke="none"
              >
                {data.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<DonutTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex flex-col gap-2">
          {data.map((entry) => {
            const pct = total > 0 ? ((entry.value / total) * 100).toFixed(1) : '0.0';
            return (
              <div key={entry.name} className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                <div className="flex flex-col">
                  <span className="text-[10px] text-[#f3f0ed]/50">{entry.name}</span>
                  <span className="text-xs font-bold tabular-nums text-[#f3f0ed]">
                    {entry.value.toLocaleString('pt-BR')}{' '}
                    <span className="text-[9px] font-normal text-[#f3f0ed]/30">({pct}%)</span>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
