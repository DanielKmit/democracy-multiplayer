import { ParliamentState, ParliamentSeat, Bill, Player, BotParty, PARTY_COLORS } from './types';
import { REGIONS } from './regions';

/**
 * Create initial parliament — placeholder caretaker distribution before first election.
 * Uses equal shares for all parties. The first election (after campaign phase) will
 * replace this with dynamic results based on campaign performance + voter satisfaction.
 */
export function createInitialParliament(players: Player[], botParties?: BotParty[]): ParliamentState {
  const seats: ParliamentSeat[] = [];
  let seatId = 0;

  const allParties: { id: string; color: string }[] = [];

  for (const player of players) {
    allParties.push({
      id: player.id,
      color: PARTY_COLORS[player.party.partyColor],
    });
  }

  for (const bot of (botParties ?? [])) {
    allParties.push({
      id: bot.id,
      color: bot.color,
    });
  }

  // Equal share for all parties — this is just a caretaker parliament,
  // the real seat distribution comes from the first election after campaign
  const equalShare = allParties.length > 0 ? 1 / allParties.length : 1;

  // Allocate seats per region using largest remainder with equal shares
  for (const region of REGIONS) {
    const totalSeats = region.seats;
    const quotas = allParties.map(p => {
      const quota = equalShare * totalSeats;
      return { ...p, quota, baseSeats: Math.floor(quota), remainder: quota - Math.floor(quota) };
    });

    let allocated = quotas.reduce((s, q) => s + q.baseSeats, 0);
    quotas.sort((a, b) => b.remainder - a.remainder);
    for (const q of quotas) {
      if (allocated >= totalSeats) break;
      q.baseSeats++;
      allocated++;
    }

    for (const q of quotas) {
      for (let i = 0; i < q.baseSeats; i++) {
        seats.push({
          id: seatId++,
          regionId: region.id,
          partyId: q.id,
          partyColor: q.color,
        });
      }
    }
  }

  const seatsByParty: Record<string, number> = {};
  for (const seat of seats) {
    seatsByParty[seat.partyId] = (seatsByParty[seat.partyId] ?? 0) + 1;
  }

  // Update bot party seat counts
  if (botParties) {
    for (const bot of botParties) {
      bot.seats = seatsByParty[bot.id] ?? 0;
    }
  }

  return {
    seats,
    seatsByParty,
    coalitionPartner: null,
    speakerId: null,
  };
}

/**
 * Allocate seats from vote shares across ALL parties (human + bot).
 * regionVoteShares: { regionId: { partyId: votePercent } }
 */
export function allocateSeats(
  regionVoteShares: Record<string, Record<string, number>>,
  players: Player[],
  botParties?: BotParty[],
): ParliamentState {
  const seats: ParliamentSeat[] = [];
  let seatId = 0;
  const seatsByParty: Record<string, number> = {};

  // Build color map for all parties
  const colorMap: Record<string, string> = {};
  for (const p of players) {
    colorMap[p.id] = PARTY_COLORS[p.party.partyColor];
  }
  for (const bot of (botParties ?? [])) {
    colorMap[bot.id] = bot.color;
  }

  for (const region of REGIONS) {
    const shares = regionVoteShares[region.id];
    if (!shares) continue;

    const totalSeats = region.seats;
    const partyIds = Object.keys(shares);
    const totalVotes = partyIds.reduce((sum, pid) => sum + (shares[pid] ?? 0), 0);

    if (totalVotes === 0) continue;

    const quotas: { partyId: string; quota: number; seats: number; remainder: number }[] = [];

    for (const pid of partyIds) {
      const share = (shares[pid] ?? 0) / totalVotes;
      const quota = share * totalSeats;
      const baseSeats = Math.floor(quota);
      quotas.push({ partyId: pid, quota, seats: baseSeats, remainder: quota - baseSeats });
    }

    let allocated = quotas.reduce((sum, q) => sum + q.seats, 0);
    quotas.sort((a, b) => b.remainder - a.remainder);
    for (const q of quotas) {
      if (allocated >= totalSeats) break;
      q.seats++;
      allocated++;
    }

    for (const q of quotas) {
      for (let i = 0; i < q.seats; i++) {
        seats.push({
          id: seatId++,
          regionId: region.id,
          partyId: q.partyId,
          partyColor: colorMap[q.partyId] ?? '#666',
        });
        seatsByParty[q.partyId] = (seatsByParty[q.partyId] ?? 0) + 1;
      }
    }
  }

  return {
    seats,
    seatsByParty,
    coalitionPartner: null,
    speakerId: null,
  };
}

/**
 * Vote on a bill — ALL parties vote based on ideology alignment.
 * Now factors in: lobby influence, whip bonus, and public pressure.
 * Returns updated bill with per-party vote breakdown.
 */
export function voteBill(
  bill: Bill,
  parliament: ParliamentState,
  authorPlayerId: string,
  players: Player[],
  botParties: BotParty[],
  policyValues: Record<string, number>,
  oppositionPlayerVote?: 'support' | 'oppose' | null,
): Bill {
  const updatedBill = {
    ...bill,
    seatVotes: {} as Record<number, boolean>,
    partyVotes: {} as Record<string, { yes: number; no: number }>,
  };
  let votesFor = 0;
  let votesAgainst = 0;

  // Influence factors from the bill
  const lobbyInfluence = bill.lobbyInfluence ?? {};
  const whipBonus = bill.whipBonus ?? 0;
  const publicPressure = bill.publicPressure ?? 0;

  // Determine how each party votes
  const partyDecisions: Record<string, number> = {}; // probability of voting yes (0-1)

  // Author's party always votes yes (high loyalty)
  partyDecisions[authorPlayerId] = 0.95;

  // Whip bonus: author's coalition partners vote more favorably
  // whipBonus adds 0-30% to coalition partner loyalty
  
  // Other human player
  const otherHuman = players.find(p => p.id !== authorPlayerId);
  if (otherHuman) {
    if (oppositionPlayerVote === 'support') {
      partyDecisions[otherHuman.id] = 0.85;
    } else if (oppositionPlayerVote === 'oppose') {
      partyDecisions[otherHuman.id] = 0.10;
    } else {
      partyDecisions[otherHuman.id] = 0.10; // oppose by default
    }
  }

  // Bot parties vote based on policy alignment + influence
  for (const bot of botParties) {
    let yesProb = 0.35; // default slight opposition to change
    
    const pref = bot.policyPreferences[bill.policyId];
    if (pref !== undefined) {
      const currentValue = policyValues[bill.policyId] ?? 50;
      const currentDist = Math.abs(currentValue - pref);
      const proposedDist = Math.abs(bill.proposedValue - pref);
      // Base probability from ideology alignment
      if (proposedDist < currentDist) {
        yesProb = 0.6 + (currentDist - proposedDist) / 200; // 60-90%
      } else {
        yesProb = 0.2 - (proposedDist - currentDist) / 400; // 5-20%
      }
    }

    // Lobby influence: +10% per PC spent on this party
    const lobbyPC = lobbyInfluence[bot.id] ?? 0;
    if (lobbyPC > 0) {
      yesProb += lobbyPC * 0.10;
    } else if (lobbyPC < 0) {
      // Counter-lobbying (opposition lobbied against)
      yesProb -= Math.abs(lobbyPC) * 0.10;
    }

    // Whip bonus: applies to coalition partners (+15% per whip level)
    // whipBonus is 0-30, so up to +30% for coalition partners
    yesProb += whipBonus / 100;

    // Public pressure: applies to all parties (+/-5% per unit)
    yesProb += publicPressure / 100;

    partyDecisions[bot.id] = Math.max(0.02, Math.min(0.98, yesProb));
  }

  // Apply decisions to seats with probability
  for (const seat of parliament.seats) {
    const yesProb = partyDecisions[seat.partyId] ?? 0.35;
    const voteYes = Math.random() < yesProb;

    updatedBill.seatVotes![seat.id] = voteYes;

    // Track per-party votes
    if (!updatedBill.partyVotes![seat.partyId]) {
      updatedBill.partyVotes![seat.partyId] = { yes: 0, no: 0 };
    }
    if (voteYes) {
      votesFor++;
      updatedBill.partyVotes![seat.partyId].yes++;
    } else {
      votesAgainst++;
      updatedBill.partyVotes![seat.partyId].no++;
    }
  }

  updatedBill.votesFor = votesFor;
  updatedBill.votesAgainst = votesAgainst;
  updatedBill.status = votesFor >= 51 ? 'passed' : 'failed';

  return updatedBill;
}

export function getParliamentMajority(parliament: ParliamentState): string | null {
  for (const [partyId, seats] of Object.entries(parliament.seatsByParty)) {
    if (seats >= 51) return partyId;
  }
  return null;
}

/**
 * Get total seats for a player including their coalition partners.
 */
export function getCoalitionSeats(
  parliament: ParliamentState,
  playerId: string,
  coalitionPartnerIds: string[],
): number {
  let total = parliament.seatsByParty[playerId] ?? 0;
  for (const partnerId of coalitionPartnerIds) {
    total += parliament.seatsByParty[partnerId] ?? 0;
  }
  return total;
}
