'use client';

import { useState, useMemo, useCallback, useRef } from 'react';
import { useGameStore } from '@/lib/store';
import { POLICIES } from '@/lib/engine/policies';
import { VOTER_GROUPS } from '@/lib/engine/voters';
import { SimVarKey } from '@/lib/engine/types';

interface WebNode {
  id: string;
  label: string;
  type: 'policy' | 'simvar' | 'voter' | 'situation';
  x: number;
  y: number;
  color: string;
  radius: number;
  value?: number;
  pulsing?: boolean;
}

interface WebEdge {
  from: string;
  to: string;
  weight: number;
  positive: boolean;
}

const SIM_VAR_LABELS: Record<string, string> = {
  gdpGrowth: 'GDP', unemployment: 'Unemployment', inflation: 'Inflation',
  crime: 'Crime', pollution: 'Pollution', equality: 'Equality', healthIndex: 'Health',
  educationIndex: 'Education', freedomIndex: 'Freedom', nationalSecurity: 'Security', corruption: 'Corruption',
};

const TYPE_COLORS = {
  policy: '#6366F1',
  simvar: '#F59E0B',
  voter: '#22C55E',
  situation: '#F97316',
};

const CATEGORY_COLORS: Record<string, string> = {
  economy: '#3B82F6', welfare: '#EC4899', society: '#8B5CF6',
  environment: '#22C55E', security: '#EF4444', infrastructure: '#F59E0B',
};

export function PolicyWeb() {
  const { gameState, setDetailPanel, detailPanelNodeId } = useGameStore();
  const [filter, setFilter] = useState<'all' | 'policy' | 'simvar' | 'voter'>('all');
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [viewBox, setViewBox] = useState({ x: 0, y: 0, w: 1000, h: 700 });
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const { nodes, edges } = useMemo(() => {
    if (!gameState) return { nodes: [], edges: [] };

    const nodes: WebNode[] = [];
    const edges: WebEdge[] = [];

    const cx = 500, cy = 350;

    // Sim vars — center cluster
    const simVars = Object.keys(SIM_VAR_LABELS);
    simVars.forEach((key, i) => {
      const angle = (i / simVars.length) * Math.PI * 2 - Math.PI / 2;
      const r = 130;
      const val = gameState.simulation[key as SimVarKey];
      const isBad = (key === 'crime' || key === 'pollution' || key === 'corruption' || key === 'unemployment' || key === 'inflation')
        ? val > 60 : val < 40;
      nodes.push({
        id: `sim_${key}`, label: SIM_VAR_LABELS[key], type: 'simvar',
        x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r,
        color: TYPE_COLORS.simvar, radius: 24, value: val,
        pulsing: isBad,
      });
    });

    // Policies — left arc
    const visiblePolicies = POLICIES.slice(0, 28);
    visiblePolicies.forEach((policy, i) => {
      const angleStart = Math.PI * 0.55;
      const angleEnd = Math.PI * 1.45;
      const angle = angleStart + (i / (visiblePolicies.length - 1)) * (angleEnd - angleStart);
      const r = 320;
      nodes.push({
        id: `pol_${policy.id}`, label: policy.name, type: 'policy',
        x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r,
        color: CATEGORY_COLORS[policy.category] || TYPE_COLORS.policy,
        radius: 16 + Math.abs(policy.budgetCostPerPoint) * 5,
        value: gameState.policies[policy.id],
      });

      // Edges to sim vars
      for (const [simKey, effect] of Object.entries(policy.effects)) {
        const magnitude = Math.abs(effect as number);
        if (magnitude > 0.005) {
          edges.push({
            from: `pol_${policy.id}`, to: `sim_${simKey}`,
            weight: magnitude * 15, positive: (effect as number) > 0,
          });
        }
      }
    });

    // Voters — right arc
    VOTER_GROUPS.forEach((group, i) => {
      const angleStart = -Math.PI * 0.45;
      const angleEnd = Math.PI * 0.45;
      const angle = angleStart + (i / (VOTER_GROUPS.length - 1)) * (angleEnd - angleStart);
      const r = 310;
      nodes.push({
        id: `voter_${group.id}`, label: group.name, type: 'voter',
        x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r,
        color: TYPE_COLORS.voter,
        radius: 14 + group.populationShare * 60,
        value: (() => {
          // Show current player's satisfaction with this group, or average
          const allSats = Object.values(gameState.voterSatisfaction).map(s => s[group.id] ?? 50);
          return allSats.length > 0 ? Math.round(allSats.reduce((a, b) => a + b, 0) / allSats.length) : 50;
        })(),
      });

      // Edges from sim vars
      for (const [simKey, weight] of Object.entries(group.concerns)) {
        edges.push({
          from: `sim_${simKey}`, to: `voter_${group.id}`,
          weight: Math.abs(weight!) * 12, positive: weight! > 0,
        });
      }
    });

    // Situations
    gameState.activeSituations.forEach((sit, i) => {
      const angle = -Math.PI / 2 + (i / Math.max(1, gameState.activeSituations.length - 1)) * Math.PI * 0.4 - Math.PI * 0.2;
      const r = 200;
      nodes.push({
        id: `sit_${sit.id}`, label: sit.id.replace(/_/g, ' '),
        type: 'situation',
        x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r,
        color: TYPE_COLORS.situation, radius: 20, pulsing: true,
      });
    });

    return { nodes, edges };
  }, [gameState]);

  const filteredNodes = useMemo(() => {
    if (filter === 'all') return nodes;
    return nodes.filter(n => n.type === filter);
  }, [nodes, filter]);

  const nodeMap = useMemo(() => new Map(nodes.map(n => [n.id, n])), [nodes]);

  const activeNodeId = hoveredNode || detailPanelNodeId;

  const relevantEdges = useMemo(() => {
    const fNodeIds = new Set(filteredNodes.map(n => n.id));
    let result = edges.filter(e => fNodeIds.has(e.from) || fNodeIds.has(e.to));
    if (activeNodeId) {
      result = result.filter(e => e.from === activeNodeId || e.to === activeNodeId);
    }
    return result;
  }, [edges, filteredNodes, activeNodeId]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const scale = e.deltaY > 0 ? 1.1 : 0.9;
    setViewBox(prev => {
      const ncx = prev.x + prev.w / 2;
      const ncy = prev.y + prev.h / 2;
      const nw = prev.w * scale;
      const nh = prev.h * scale;
      return { x: ncx - nw / 2, y: ncy - nh / 2, w: nw, h: nh };
    });
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.target === svgRef.current || (e.target as SVGElement).tagName === 'rect') {
      setDragging(true);
      setDragStart({ x: e.clientX, y: e.clientY });
    }
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging) return;
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;
    setDragStart({ x: e.clientX, y: e.clientY });
    setViewBox(prev => ({ ...prev, x: prev.x - dx * (prev.w / 1000), y: prev.y - dy * (prev.h / 700) }));
  }, [dragging, dragStart]);

  const handleMouseUp = useCallback(() => setDragging(false), []);

  if (!gameState) return null;

  return (
    <div className="h-full flex flex-col">
      {/* Filter bar */}
      <div className="flex items-center gap-2 p-2 border-b border-slate-800/50 bg-slate-900/30">
        {(['all', 'policy', 'simvar', 'voter'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1 rounded-full text-xs transition-all ${
              filter === f ? 'bg-slate-700 text-white' : 'text-slate-500 hover:text-slate-300'
            }`}>
            <span className="inline-block w-2 h-2 rounded-full mr-1" style={{
              backgroundColor: f === 'all' ? '#94a3b8' : TYPE_COLORS[f],
            }} />
            {f === 'all' ? 'All' : f === 'simvar' ? 'Variables' : f === 'voter' ? 'Voters' : 'Policies'}
          </button>
        ))}
      </div>

      {/* SVG Canvas */}
      <div className="flex-1 overflow-hidden" style={{ cursor: dragging ? 'grabbing' : 'grab' }}>
        <svg
          ref={svgRef}
          viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
          className="w-full h-full"
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <rect x={viewBox.x} y={viewBox.y} width={viewBox.w} height={viewBox.h} fill="transparent" />

          {/* Edges */}
          {relevantEdges.map((edge, i) => {
            const from = nodeMap.get(edge.from);
            const to = nodeMap.get(edge.to);
            if (!from || !to) return null;
            const isHighlighted = activeNodeId === edge.from || activeNodeId === edge.to;
            return (
              <line key={i}
                x1={from.x} y1={from.y} x2={to.x} y2={to.y}
                stroke={edge.positive ? '#22C55E' : '#EF4444'}
                strokeWidth={Math.max(0.5, Math.min(edge.weight * 0.5, 4))}
                opacity={activeNodeId ? (isHighlighted ? 0.6 : 0.04) : 0.1}
                className="transition-opacity duration-200"
              />
            );
          })}

          {/* Nodes */}
          {filteredNodes.map(node => {
            const isSelected = detailPanelNodeId === node.id;
            const isHovered = hoveredNode === node.id;
            const isConnected = activeNodeId
              ? relevantEdges.some(e => (e.from === activeNodeId && e.to === node.id) || (e.to === activeNodeId && e.from === node.id))
              : false;
            const showFull = !activeNodeId || isSelected || isHovered || isConnected || activeNodeId === node.id;

            return (
              <g key={node.id} className="cursor-pointer" opacity={showFull ? 1 : 0.15}
                onClick={(e) => { e.stopPropagation(); setDetailPanel(node.id); }}
                onMouseEnter={() => setHoveredNode(node.id)}
                onMouseLeave={() => setHoveredNode(null)}
              >
                {/* Glow for pulsing/selected */}
                {(node.pulsing || isSelected) && (
                  <circle cx={node.x} cy={node.y} r={node.radius + 6}
                    fill="none" stroke={node.pulsing ? '#F97316' : '#3B82F6'}
                    strokeWidth="2" opacity="0.3"
                    className={node.pulsing ? 'animate-pulse' : ''}
                  />
                )}
                {/* Main circle */}
                <circle cx={node.x} cy={node.y} r={node.radius}
                  fill={node.color} fillOpacity={0.15}
                  stroke={node.color}
                  strokeWidth={isSelected ? 3 : isHovered ? 2.5 : 1.5}
                  className="transition-all duration-150"
                />
                {/* Value text */}
                {node.value !== undefined && (
                  <text x={node.x} y={node.y + 1} textAnchor="middle" dominantBaseline="middle"
                    fill="white" fontSize={node.radius > 20 ? "10" : "8"} fontWeight="bold">
                    {Math.round(node.value)}
                  </text>
                )}
                {/* Label */}
                <text x={node.x} y={node.y + node.radius + 11} textAnchor="middle"
                  fill="#94a3b8" fontSize="7" className="pointer-events-none select-none">
                  {node.label.length > 16 ? node.label.slice(0, 14) + '…' : node.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 p-2 border-t border-slate-800/50 text-[10px] text-slate-500">
        <span><span className="inline-block w-3 h-0.5 bg-green-500 mr-1" />Positive</span>
        <span><span className="inline-block w-3 h-0.5 bg-red-500 mr-1" />Negative</span>
        <span><span className="inline-block w-2 h-2 rounded-full mr-1" style={{ backgroundColor: TYPE_COLORS.policy }} />Policy</span>
        <span><span className="inline-block w-2 h-2 rounded-full mr-1" style={{ backgroundColor: TYPE_COLORS.simvar }} />Variable</span>
        <span><span className="inline-block w-2 h-2 rounded-full mr-1" style={{ backgroundColor: TYPE_COLORS.voter }} />Voter</span>
        <span><span className="inline-block w-2 h-2 rounded-full mr-1" style={{ backgroundColor: TYPE_COLORS.situation }} />Crisis</span>
      </div>
    </div>
  );
}
