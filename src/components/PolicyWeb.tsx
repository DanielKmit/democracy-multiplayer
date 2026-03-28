'use client';

import { useState, useMemo, useCallback } from 'react';
import { useGameStore } from '@/lib/store';
import { POLICIES, POLICIES_BY_CATEGORY } from '@/lib/engine/policies';
import { VOTER_GROUPS } from '@/lib/engine/voters';
import { PolicyCategory, SimVarKey } from '@/lib/engine/types';

interface GraphNode {
  id: string;
  label: string;
  type: 'policy' | 'simvar' | 'voter' | 'situation';
  x: number;
  y: number;
  color: string;
  value?: number;
}

interface GraphEdge {
  from: string;
  to: string;
  weight: number;
  positive: boolean;
}

const SIM_VAR_LABELS: Record<string, string> = {
  gdpGrowth: 'GDP Growth',
  unemployment: 'Unemployment',
  inflation: 'Inflation',
  crime: 'Crime',
  pollution: 'Pollution',
  equality: 'Equality',
  healthIndex: 'Health',
  educationIndex: 'Education',
  freedomIndex: 'Freedom',
  nationalSecurity: 'Security',
  corruption: 'Corruption',
};

const TYPE_COLORS: Record<string, string> = {
  policy: '#3B82F6',
  simvar: '#EAB308',
  voter: '#22C55E',
  situation: '#F97316',
};

export function PolicyWeb() {
  const { gameState, selectedNode, setSelectedNode } = useGameStore();
  const [filter, setFilter] = useState<'all' | 'policy' | 'simvar' | 'voter'>('all');

  const { nodes, edges } = useMemo(() => {
    if (!gameState) return { nodes: [], edges: [] };

    const nodes: GraphNode[] = [];
    const edges: GraphEdge[] = [];

    const centerX = 400;
    const centerY = 300;

    // Simulation variables — inner ring
    const simVars = Object.keys(SIM_VAR_LABELS);
    simVars.forEach((key, i) => {
      const angle = (i / simVars.length) * Math.PI * 2 - Math.PI / 2;
      const radius = 120;
      nodes.push({
        id: `sim_${key}`,
        label: SIM_VAR_LABELS[key],
        type: 'simvar',
        x: centerX + Math.cos(angle) * radius,
        y: centerY + Math.sin(angle) * radius,
        color: TYPE_COLORS.simvar,
        value: gameState.simulation[key as SimVarKey],
      });
    });

    // Policies — outer ring
    const visiblePolicies = POLICIES.slice(0, 24); // Limit for readability
    visiblePolicies.forEach((policy, i) => {
      const angle = (i / visiblePolicies.length) * Math.PI * 2 - Math.PI / 2;
      const radius = 250;
      nodes.push({
        id: `pol_${policy.id}`,
        label: policy.name,
        type: 'policy',
        x: centerX + Math.cos(angle) * radius,
        y: centerY + Math.sin(angle) * radius,
        color: TYPE_COLORS.policy,
        value: gameState.policies[policy.id],
      });

      // Edges from policies to sim vars
      for (const [simKey, effect] of Object.entries(policy.effects)) {
        edges.push({
          from: `pol_${policy.id}`,
          to: `sim_${simKey}`,
          weight: Math.abs(effect as number) * 10,
          positive: (effect as number) > 0,
        });
      }
    });

    // Voter groups — middle ring offset
    VOTER_GROUPS.forEach((group, i) => {
      const angle = (i / VOTER_GROUPS.length) * Math.PI * 2 - Math.PI / 2 + 0.3;
      const radius = 180;
      nodes.push({
        id: `voter_${group.id}`,
        label: group.name,
        type: 'voter',
        x: centerX + Math.cos(angle) * radius,
        y: centerY + Math.sin(angle) * radius,
        color: TYPE_COLORS.voter,
        value: gameState.voterSatisfaction[group.id],
      });

      // Edges from sim vars to voters
      for (const [simKey, weight] of Object.entries(group.concerns)) {
        edges.push({
          from: `sim_${simKey}`,
          to: `voter_${group.id}`,
          weight: Math.abs(weight) * 8,
          positive: weight > 0,
        });
      }
    });

    // Situations — as overlay nodes
    gameState.activeSituations.forEach((sit, i) => {
      nodes.push({
        id: `sit_${sit.id}`,
        label: sit.id.replace(/_/g, ' '),
        type: 'situation',
        x: centerX + 50 + i * 30,
        y: 50,
        color: TYPE_COLORS.situation,
      });
    });

    return { nodes, edges };
  }, [gameState]);

  const filteredNodes = useMemo(() => {
    if (filter === 'all') return nodes;
    return nodes.filter(n => n.type === filter);
  }, [nodes, filter]);

  const filteredEdges = useMemo(() => {
    const nodeIds = new Set(filteredNodes.map(n => n.id));

    if (selectedNode) {
      return edges.filter(e =>
        (e.from === selectedNode || e.to === selectedNode) &&
        nodeIds.has(e.from) && nodeIds.has(e.to)
      );
    }

    if (filter !== 'all') {
      return edges.filter(e => nodeIds.has(e.from) || nodeIds.has(e.to));
    }

    return edges;
  }, [edges, filteredNodes, selectedNode, filter]);

  const nodeMap = useMemo(() => new Map(nodes.map(n => [n.id, n])), [nodes]);

  if (!gameState) return null;

  return (
    <div className="h-full flex flex-col">
      {/* Filter bar */}
      <div className="flex items-center gap-2 p-2 border-b border-slate-800">
        {(['all', 'policy', 'simvar', 'voter'] as const).map(f => (
          <button
            key={f}
            onClick={() => { setFilter(f); setSelectedNode(null); }}
            className={`px-3 py-1 rounded-full text-xs transition-all ${
              filter === f
                ? 'bg-slate-700 text-white'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <span className="inline-block w-2 h-2 rounded-full mr-1" style={{
              backgroundColor: f === 'all' ? '#94a3b8' : TYPE_COLORS[f],
            }} />
            {f === 'all' ? 'All' : f === 'simvar' ? 'Variables' : f === 'voter' ? 'Voters' : 'Policies'}
          </button>
        ))}
        {selectedNode && (
          <button
            onClick={() => setSelectedNode(null)}
            className="ml-auto text-xs text-slate-500 hover:text-slate-300"
          >
            Clear selection ✕
          </button>
        )}
      </div>

      {/* Graph SVG */}
      <div className="flex-1 overflow-hidden">
        <svg viewBox="0 0 800 600" className="w-full h-full">
          {/* Edges */}
          {filteredEdges.map((edge, i) => {
            const fromNode = nodeMap.get(edge.from);
            const toNode = nodeMap.get(edge.to);
            if (!fromNode || !toNode) return null;

            const isHighlighted = selectedNode === edge.from || selectedNode === edge.to;
            const opacity = selectedNode ? (isHighlighted ? 0.7 : 0.05) : 0.15;

            return (
              <line
                key={i}
                x1={fromNode.x}
                y1={fromNode.y}
                x2={toNode.x}
                y2={toNode.y}
                stroke={edge.positive ? '#22C55E' : '#EF4444'}
                strokeWidth={Math.max(0.5, edge.weight * 0.5)}
                opacity={opacity}
                className="transition-opacity duration-200"
              />
            );
          })}

          {/* Nodes */}
          {filteredNodes.map(node => {
            const isSelected = selectedNode === node.id;
            const isHighlighted = selectedNode
              ? isSelected || filteredEdges.some(e => (e.from === selectedNode && e.to === node.id) || (e.to === selectedNode && e.from === node.id))
              : true;
            const radius = node.type === 'simvar' ? 22 : node.type === 'voter' ? 18 : node.type === 'situation' ? 16 : 14;

            return (
              <g
                key={node.id}
                className="cursor-pointer"
                opacity={selectedNode && !isHighlighted ? 0.2 : 1}
                onClick={() => setSelectedNode(isSelected ? null : node.id)}
              >
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={radius}
                  fill={node.color}
                  fillOpacity={0.2}
                  stroke={node.color}
                  strokeWidth={isSelected ? 3 : 1.5}
                  className="transition-all duration-200"
                />
                {node.value !== undefined && (
                  <text
                    x={node.x}
                    y={node.y + 1}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="white"
                    fontSize="9"
                    fontWeight="bold"
                  >
                    {Math.round(node.value)}
                  </text>
                )}
                <text
                  x={node.x}
                  y={node.y + radius + 10}
                  textAnchor="middle"
                  fill="#94a3b8"
                  fontSize="8"
                  className="pointer-events-none"
                >
                  {node.label.length > 14 ? node.label.slice(0, 12) + '…' : node.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 p-2 border-t border-slate-800 text-xs text-slate-500">
        <span><span className="inline-block w-3 h-0.5 bg-green-500 mr-1" />Positive</span>
        <span><span className="inline-block w-3 h-0.5 bg-red-500 mr-1" />Negative</span>
        <span><span className="inline-block w-2 h-2 rounded-full bg-blue-500 mr-1" />Policy</span>
        <span><span className="inline-block w-2 h-2 rounded-full bg-yellow-500 mr-1" />Variable</span>
        <span><span className="inline-block w-2 h-2 rounded-full bg-green-500 mr-1" />Voter</span>
      </div>
    </div>
  );
}
