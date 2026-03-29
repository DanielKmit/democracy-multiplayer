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
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

export function SparklinePanel() {
  const { gameState, playerId } = useGameStore();
  if (!gameState || gameState.turnHistory.length === 0) return null;

  const history = gameState.turnHistory;
  const myPlayer = gameState.players.find(p => p.id === playerId);
  const myApproval = myPlayer ? (gameState.approvalRating[myPlayer.id] ?? 50) : gameState.rulingApproval ?? 50;

  const metrics: { label: string; data: number[]; current: string; color: string; goodDirection: 'up' | 'down' }[] = [
    {
      label: myPlayer?.role === 'ruling' ? 'Approval' : 'Support',
      data: history.map(h => h.approval),
      current: `${Math.round(myApproval)}%`,
      color: myApproval > 50 ? '#22C55E' : '#EF4444',
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
      current: `${gameState.budget.debtToGdp.toFixed(0)}% ${gameState.budget.creditRating}`,
      color: gameState.budget.debtToGdp < 60 ? '#22C55E' : gameState.budget.debtToGdp < 100 ? '#EAB308' : '#EF4444',
      goodDirection: 'down',
    },
  ];

  const getTrend = (data: number[], goodDir: 'up' | 'down') => {
    if (data.length < 2) return '';
    const diff = data[data.length - 1] - data[data.length - 2];
    if (Math.abs(diff) < 0.5) return '→';
    const isUp = diff > 0;
    return (goodDir === 'up' ? isUp : !isUp) ? '↑' : '↓';
  };

  return (
    <div className="space-y-3">
      <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Indicators</h3>

      {metrics.map(metric => (
        <div key={metric.label} className="p-2 bg-slate-800/30 rounded-lg border border-slate-700/50">
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
      <div className="p-2.5 bg-slate-800/30 rounded-lg border border-slate-700/50">
        <h4 className="text-[10px] text-slate-500 uppercase mb-2">Budget (Billions)</h4>
        <div className="space-y-1 text-xs">
          <div className="flex justify-between">
            <span className="text-slate-500">Revenue</span>
            <span className="text-green-400">{gameState.budget.revenue.toFixed(1)}B</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Spending</span>
            <span className="text-red-400">{gameState.budget.spending.toFixed(1)}B</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Interest</span>
            <span className="text-yellow-400">{(gameState.budget.interestPayments ?? 0).toFixed(1)}B</span>
          </div>
          <div className="flex justify-between border-t border-slate-700 pt-1 font-medium">
            <span className="text-slate-400">{gameState.budget.balance >= 0 ? 'Surplus' : 'Deficit'}</span>
            <span className={gameState.budget.balance >= 0 ? 'text-green-400' : 'text-red-400'}>
              {gameState.budget.balance >= 0 ? '+' : ''}{gameState.budget.balance.toFixed(1)}B
            </span>
          </div>
          <div className="flex justify-between pt-0.5">
            <span className="text-slate-500">Total Debt</span>
            <span className="text-slate-300">{(gameState.budget.debtTotal ?? 0).toFixed(0)}B</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Interest Rate</span>
            <span className="text-slate-300">{(gameState.budget.interestRate ?? 2).toFixed(1)}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
