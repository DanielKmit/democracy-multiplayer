import { ParliamentState, ParliamentSeat, Bill, Player, BotParty, PARTY_COLORS } from './types';
import { REGIONS } from './regions';

/**
 * Create initial parliament with caretaker distribution across ALL parties (human + bot).
 * No human player should have 51+ seats. Bot parties get realistic shares.
 */
export function createInitialParliament(players: Player[], botParties?: BotParty[]): ParliamentState {
  const seats: ParliamentSeat[] = [];
  let seatId = 0;

  // Default seat share: human players ~30% each, bots split the rest
  // With 2 human + 4 bot = 6 parties
  const allParties: { id: string; color: string; share: number }[] = [];

  // Human players get ~30-32 each
  if (players[0]) {
    allParties.push({
      id: players[0].id,
      color: PARTY_COLORS[players[0].party.partyColor],
      share: 0.32,
    });
  }
  if (players[1]) {
    allParties.push({
      id: players[1].id,
      color: PARTY_COLORS[players[1].party.partyColor],
      share: 0.28,
    });
  }

  // Bot parties
  const botShares: Record<string, number> = {
    bot_green: 0.12,
    bot_national: 0.11,
    bot_workers: 0.10,
    bot_freemarket: 0.07,
  };

  for (const bot of (botParties ?? [])) {
    allParties.push({
      id: bot.id,
      color: bot.color,
      share: botShares[bot.id] ?? 0.08,
    });
  }

  // Normalize shares
  const totalShare = allParties.reduce((s, p) => s + p.share, 0);
  for (const p of allParties) {
    p.share /= totalShare;
  }

  // Allocate seats per region using largest remainder
  for (const region of REGIONS) {
    const totalSeats = region.seats;
    const quotas = allParties.map(p => {
      const quota = p.share * totalSeats;
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

  // Determine how each party votes
  const partyDecisions: Record<string, boolean> = {};

  // Author's party always votes yes
  partyDecisions[authorPlayerId] = true;

  // Other human player
  const otherHuman = players.find(p => p.id !== authorPlayerId);
  if (otherHuman) {
    if (oppositionPlayerVote === 'support') {
      partyDecisions[otherHuman.id] = true;
    } else if (oppositionPlayerVote === 'oppose') {
      partyDecisions[otherHuman.id] = false;
    } else {
      // Auto-decide: oppose by default if they're opposition
      partyDecisions[otherHuman.id] = false;
    }
  }

  // Bot parties vote based on policy alignment
  for (const bot of botParties) {
    const pref = bot.policyPreferences[bill.policyId];
    if (pref !== undefined) {
      const currentValue = policyValues[bill.policyId] ?? 50;
      const currentDist = Math.abs(currentValue - pref);
      const proposedDist = Math.abs(bill.proposedValue - pref);
      // Vote yes if the proposed value is closer to their preference
      partyDecisions[bot.id] = proposedDist < currentDist;
    } else {
      // No strong opinion — slight tendency to oppose change
      partyDecisions[bot.id] = Math.random() < 0.35;
    }
  }

  // Apply decisions to seats with some rebel chance
  for (const seat of parliament.seats) {
    const partyVotesYes = partyDecisions[seat.partyId] ?? false;
    let voteYes: boolean;

    if (partyVotesYes) {
      // 90% follow party line, 10% rebel
      voteYes = Math.random() < 0.90;
    } else {
      // 90% follow party line (vote no), 10% rebel to yes
      voteYes = Math.random() < 0.10;
    }

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
