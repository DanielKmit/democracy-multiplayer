import { ExtremismState, SimulationState } from './types';

export function createInitialExtremism(): ExtremismState {
  return {
    far_left: 10,
    far_right: 10,
    religious: 10,
    eco: 10,
    assassinationAttempted: false,
    assassinationSucceeded: false,
  };
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

export function updateExtremism(
  current: ExtremismState,
  policies: Record<string, number>,
  sim: SimulationState
): ExtremismState {
  const next = { ...current, assassinationAttempted: false, assassinationSucceeded: false };

  // Intelligence spending provides general suppression
  const intelSuppression = ((policies.intelligence ?? 30) - 30) * 0.04; // 0 at 30, +2.8 at 100

  // Far-left: high inequality, low workers rights, low minimum wage
  const leftDrivers =
    (100 - sim.equality) * 0.3 +
    (100 - (policies.minimum_wage ?? 40)) * 0.2 +
    (100 - (policies.unemployment_benefits ?? 40)) * 0.15 +
    sim.unemployment * 0.25;
  next.far_left = clamp(current.far_left + (leftDrivers - 50) * 0.20 - intelSuppression, 0, 100);

  // Far-right: high immigration, low patriotism/border security
  const rightDrivers =
    (policies.immigration ?? 50) * 0.3 +
    (100 - (policies.border_security ?? 45)) * 0.25 +
    (100 - (policies.military ?? 40)) * 0.15 +
    sim.crime * 0.2;
  next.far_right = clamp(current.far_right + (rightDrivers - 50) * 0.20 - intelSuppression, 0, 100);

  // Religious extremists: low religious freedom
  const relDrivers =
    (100 - (policies.religious_freedom ?? 70)) * 0.4 +
    (100 - sim.freedomIndex) * 0.2 +
    sim.crime * 0.15;
  next.religious = clamp(current.religious + (relDrivers - 40) * 0.18 - intelSuppression, 0, 100);

  // Eco-terrorists: high pollution, low environmental action
  const ecoDrivers =
    sim.pollution * 0.35 +
    (100 - (policies.env_regulations ?? 40)) * 0.2 +
    (100 - (policies.renewables ?? 30)) * 0.15 +
    (100 - (policies.carbon_tax ?? 20)) * 0.1;
  next.eco = clamp(current.eco + (ecoDrivers - 45) * 0.18 - intelSuppression, 0, 100);

  return next;
}

export function checkAssassination(
  extremism: ExtremismState,
  intelligenceBudget: number
): { attempted: boolean; succeeded: boolean; group: string | null } {
  const groups = [
    { key: 'far_left', level: extremism.far_left, name: 'Far-Left Extremists' },
    { key: 'far_right', level: extremism.far_right, name: 'Far-Right Extremists' },
    { key: 'religious', level: extremism.religious, name: 'Religious Extremists' },
    { key: 'eco', level: extremism.eco, name: 'Eco-Terrorists' },
  ];

  for (const g of groups) {
    if (g.level > 80) {
      // Attempt!
      const intelligenceProtection = Math.min(intelligenceBudget / 100, 0.7);
      const successChance = 0.5 * (1 - intelligenceProtection);
      const succeeded = Math.random() < successChance;

      return { attempted: true, succeeded, group: g.name };
    }
  }

  return { attempted: false, succeeded: false, group: null };
}
