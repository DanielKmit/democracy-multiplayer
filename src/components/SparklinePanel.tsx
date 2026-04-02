'use client';

import { useGameStore } from '@/lib/store';

interface SparklineProps {
  data: number[];
  color: string;
  height?: number;
  width?: number;
}

function Sparkline({ data, color, height = 24, width = 100 }: SparklineProps) {
  if (data.length < 2) return <div style={{ width, height }} className="bg-game-bg rounded" />;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return `${x},${y}`;
  }).join(' ');

  // Fill area under curve
  const fillPoints = `0,${height} ${points} ${width},${height}`;

  return (
    <svg width={width} height={height} className="inline-block">
      <polygon points={fillPoints} fill={color} fillOpacity="0.08" />
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
  const sim = gameState.simulation;

  const metrics: { label: string; data: number[]; current: string; color: string; goodDirection: 'up' | 'down' }[] = [
    {
      label: myPlayer?.role === 'ruling' ? 'Approval' : 'Support',
      data: history.map(h => h.approval),
      current: `${Math.round(myApproval)}%`,
      color: myApproval > 50 ? '#10B981' : '#EF4444',
      goodDirection: 'up',
    },
    {
      label: 'GDP Growth',
      data: history.map(h => h.gdp),
      current: `${sim.gdpGrowth > 0 ? '+' : ''}${sim.gdpGrowth.toFixed(1)}%`,
      color: sim.gdpGrowth > 0 ? '#10B981' : '#EF4444',
      goodDirection: 'up',
    },
    {
      label: 'Unemployment',
      data: history.map(h => h.unemployment),
      current: `${sim.unemployment.toFixed(1)}%`,
      color: sim.unemployment < 8 ? '#10B981' : '#EF4444',
      goodDirection: 'down',
    },
    {
      label: 'Debt/GDP',
      data: history.map(h => h.debtToGdp),
      current: `${gameState.budget.debtToGdp.toFixed(0)}%`,
      color: gameState.budget.debtToGdp < 60 ? '#10B981' : gameState.budget.debtToGdp < 100 ? '#F59E0B' : '#EF4444',
      goodDirection: 'down',
    },
  ];

  const getTrend = (data: number[], goodDir: 'up' | 'down') => {
    if (data.length < 2) return { icon: '→', color: 'text-game-muted' };
    const diff = data[data.length - 1] - data[data.length - 2];
    if (Math.abs(diff) < 0.5) return { icon: '→', color: 'text-game-muted' };
    const isUp = diff > 0;
    const isGood = goodDir === 'up' ? isUp : !isUp;
    return { icon: isUp ? '↑' : '↓', color: isGood ? 'text-emerald-400' : 'text-red-400' };
  };

  // Extra sim vars for mini dashboard
  const extraStats = [
    { label: 'Crime', value: sim.crime.toFixed(0), good: sim.crime < 40 },
    { label: 'Health', value: sim.healthIndex.toFixed(0), good: sim.healthIndex > 55 },
    { label: 'Education', value: sim.educationIndex.toFixed(0), good: sim.educationIndex > 55 },
    { label: 'Pollution', value: sim.pollution.toFixed(0), good: sim.pollution < 45 },
  ];

  // Flip-flop penalty display
  const myFlipFlop = myPlayer ? (gameState.flipFlopPenalty?.[myPlayer.id] ?? 0) : 0;

  return (
    <div className="space-y-2.5">
      <h3 className="text-[10px] font-bold text-game-muted uppercase tracking-wider">Trends</h3>

      {metrics.map(metric => {
        const trend = getTrend(metric.data, metric.goodDirection);
        return (
          <div key={metric.label} className="glass-card p-2.5">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-game-muted">{metric.label}</span>
              <div className="flex items-center gap-1">
                <span className="text-xs font-bold" style={{ color: metric.color }}>{metric.current}</span>
                <span className={`text-[10px] ${trend.color}`}>{trend.icon}</span>
              </div>
            </div>
            <Sparkline data={metric.data} color={metric.color} width={220} height={22} />
          </div>
        );
      })}

      {/* Extra sim vars grid */}
      <div className="grid grid-cols-4 gap-1.5">
        {extraStats.map(s => (
          <div key={s.label} className="stat-card !p-1.5">
            <div className={`text-xs font-bold ${s.good ? 'text-emerald-400' : 'text-red-400'}`}>{s.value}</div>
            <div className="text-[8px] text-game-muted">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Flip-flop warning */}
      {myFlipFlop > 0 && (
        <div className="glass-card p-2 border-amber-800/20 bg-amber-950/10">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-amber-400 font-medium">⚠ Flip-flop penalty</span>
            <span className="text-[10px] text-amber-400 font-bold">-{Math.min(15, myFlipFlop * 0.5).toFixed(0)} approval</span>
          </div>
          <div className="w-full h-1 progress-bar-track mt-1">
            <div className="h-full progress-bar-fill bg-amber-500" style={{ width: `${(myFlipFlop / 30) * 100}%` }} />
          </div>
        </div>
      )}

      {/* Budget Summary */}
      <div className="glass-card p-2.5">
        <h4 className="text-[10px] text-game-muted uppercase tracking-wider font-bold mb-2">Budget (Billions)</h4>
        <div className="space-y-1 text-xs">
          <div className="flex justify-between">
            <span className="text-game-muted">Revenue</span>
            <span className="text-emerald-400">{gameState.budget.revenue.toFixed(1)}B</span>
          </div>
          <div className="flex justify-between">
            <span className="text-game-muted">Spending</span>
            <span className="text-red-400">{gameState.budget.spending.toFixed(1)}B</span>
          </div>
          <div className="flex justify-between">
            <span className="text-game-muted">Interest</span>
            <span className="text-amber-400">{(gameState.budget.interestPayments ?? 0).toFixed(1)}B</span>
          </div>
          <div className="flex justify-between border-t border-game-border pt-1 font-medium">
            <span className="text-game-secondary">{gameState.budget.balance >= 0 ? 'Surplus' : 'Deficit'}</span>
            <span className={gameState.budget.balance >= 0 ? 'text-emerald-400' : 'text-red-400'}>
              {gameState.budget.balance >= 0 ? '+' : ''}{gameState.budget.balance.toFixed(1)}B
            </span>
          </div>
          <div className="flex justify-between pt-0.5">
            <span className="text-game-muted">Debt</span>
            <span className="text-game-secondary">{(gameState.budget.debtTotal ?? 0).toFixed(0)}B • {gameState.budget.creditRating}</span>
          </div>
        </div>
      </div>

      {/* Focus Group Result */}
      {gameState.focusGroupResult && (
        <FocusGroupDisplay />
      )}
    </div>
  );
}

function FocusGroupDisplay() {
  const { gameState } = useGameStore();
  const { dismissFocusGroup } = require('@/lib/useGameActions').useGameActions();
  if (!gameState?.focusGroupResult) return null;

  const { policyId, predictedImpact } = gameState.focusGroupResult;
  const policyName = policyId.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());

  return (
    <div className="glass-card p-2.5 border-purple-800/20 bg-purple-950/10 animate-fade-in">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] text-purple-400 font-bold uppercase tracking-wider">🔍 Focus Group</span>
        <button onClick={dismissFocusGroup} className="text-[10px] text-game-muted hover:text-white">✕</button>
      </div>
      <div className="text-xs text-game-secondary mb-2">{policyName}</div>
      <div className="space-y-1">
        {Object.entries(predictedImpact)
          .sort(([, a], [, b]) => Math.abs(b) - Math.abs(a))
          .map(([groupId, delta]) => (
            <div key={groupId} className="flex items-center justify-between text-[10px]">
              <span className="text-game-muted capitalize">{groupId.replace(/_/g, ' ')}</span>
              <span className={delta > 0 ? 'text-emerald-400 font-medium' : delta < 0 ? 'text-red-400 font-medium' : 'text-game-muted'}>
                {delta > 0 ? '+' : ''}{delta.toFixed(1)}
              </span>
            </div>
          ))}
      </div>
    </div>
  );
}
