'use client';

import { useGameStore } from '@/lib/store';

interface SparklineProps {
  data: number[];
  color: string;
  height?: number;
  width?: number;
}

function Sparkline({ data, color, height = 24, width = 100 }: SparklineProps) {
  if (data.length < 2) return <div style={{ width, height }} className="bg-slate-800 rounded" />;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width={width} height={height} className="inline-block">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function SparklinePanel() {
  const { gameState } = useGameStore();
  if (!gameState || gameState.turnHistory.length === 0) return null;

  const history = gameState.turnHistory;

  const metrics: {
    label: string;
    data: number[];
    current: string;
    color: string;
    goodDirection: 'up' | 'down';
  }[] = [
    {
      label: 'Approval',
      data: history.map(h => h.approval),
      current: `${gameState.approvalRating}%`,
      color: gameState.approvalRating > 50 ? '#22C55E' : '#EF4444',
      goodDirection: 'up',
    },
    {
      label: 'GDP Growth',
      data: history.map(h => h.gdp),
      current: `${gameState.simulation.gdpGrowth > 0 ? '+' : ''}${gameState.simulation.gdpGrowth.toFixed(1)}%`,
      color: gameState.simulation.gdpGrowth > 0 ? '#22C55E' : '#EF4444',
      goodDirection: 'up',
    },
    {
      label: 'Unemployment',
      data: history.map(h => h.unemployment),
      current: `${gameState.simulation.unemployment.toFixed(1)}%`,
      color: gameState.simulation.unemployment < 8 ? '#22C55E' : '#EF4444',
      goodDirection: 'down',
    },
    {
      label: 'Debt/GDP',
      data: history.map(h => h.debtToGdp),
      current: `${gameState.budget.debtToGdp.toFixed(0)}%`,
      color: gameState.budget.debtToGdp < 100 ? '#22C55E' : '#EAB308',
      goodDirection: 'down',
    },
  ];

  // Trend arrow
  const getTrend = (data: number[], goodDir: 'up' | 'down') => {
    if (data.length < 2) return '';
    const last = data[data.length - 1];
    const prev = data[data.length - 2];
    const diff = last - prev;
    if (Math.abs(diff) < 0.5) return '→';
    const isUp = diff > 0;
    const isGood = goodDir === 'up' ? isUp : !isUp;
    return isGood ? '↑' : '↓';
  };

  return (
    <div className="space-y-3">
      <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Economic Indicators</h3>

      {metrics.map(metric => (
        <div key={metric.label} className="p-2 bg-slate-800/30 rounded-lg border border-slate-700">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-slate-500">{metric.label}</span>
            <span className="text-xs font-bold" style={{ color: metric.color }}>
              {metric.current} {getTrend(metric.data, metric.goodDirection)}
            </span>
          </div>
          <Sparkline data={metric.data} color={metric.color} width={220} height={20} />
        </div>
      ))}

      {/* Budget Summary */}
      <div className="p-2 bg-slate-800/30 rounded-lg border border-slate-700">
        <h4 className="text-[10px] text-slate-500 uppercase mb-1">Budget</h4>
        <div className="space-y-1 text-xs">
          <div className="flex justify-between">
            <span className="text-slate-500">Revenue</span>
            <span className="text-green-400">{gameState.budget.revenue.toFixed(0)}B</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Spending</span>
            <span className="text-red-400">{gameState.budget.spending.toFixed(0)}B</span>
          </div>
          <div className="flex justify-between border-t border-slate-700 pt-1">
            <span className="text-slate-500">{gameState.budget.deficit > 0 ? 'Deficit' : 'Surplus'}</span>
            <span className={gameState.budget.deficit > 0 ? 'text-red-400' : 'text-green-400'}>
              {Math.abs(gameState.budget.deficit).toFixed(0)}B
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
