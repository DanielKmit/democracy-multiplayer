import { ParliamentState, ParliamentSeat, Bill, Player, PARTY_COLORS } from './types';
import { REGIONS } from './regions';

export function createInitialParliament(players: Player[]): ParliamentState {
  const seats: ParliamentSeat[] = [];
  let seatId = 0;

  // Initially divide 50/50 roughly
  for (const region of REGIONS) {
    const halfSeats = Math.floor(region.seats / 2);
    const remainder = region.seats % 2;

    for (let i = 0; i < halfSeats; i++) {
      seats.push({
        id: seatId++,
        regionId: region.id,
        partyId: players[0]?.id ?? 'host',
        partyColor: players[0] ? PARTY_COLORS[players[0].party.partyColor] : '#3B82F6',
      });
    }
    for (let i = 0; i < halfSeats + remainder; i++) {
      seats.push({
        id: seatId++,
        regionId: region.id,
        partyId: players[1]?.id ?? 'client',
        partyColor: players[1] ? PARTY_COLORS[players[1].party.partyColor] : '#EF4444',
      });
    }
  }

  const seatsByParty: Record<string, number> = {};
  for (const seat of seats) {
    seatsByParty[seat.partyId] = (seatsByParty[seat.partyId] ?? 0) + 1;
  }

  return {
    seats,
    seatsByParty,
    coalitionPartner: null,
    speakerId: null,
  };
}

export function allocateSeats(
  regionVoteShares: Record<string, Record<string, number>>,
  players: Player[]
): ParliamentState {
  const seats: ParliamentSeat[] = [];
  let seatId = 0;
  const seatsByParty: Record<string, number> = {};

  for (const region of REGIONS) {
    const shares = regionVoteShares[region.id];
    if (!shares) continue;

    // Proportional allocation with largest remainder method
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

    // Allocate base seats
    let allocated = quotas.reduce((sum, q) => sum + q.seats, 0);
    
    // Distribute remaining seats by largest remainder
    quotas.sort((a, b) => b.remainder - a.remainder);
    for (const q of quotas) {
      if (allocated >= totalSeats) break;
      q.seats++;
      allocated++;
    }

    // Create seat objects
    for (const q of quotas) {
      const player = players.find(p => p.id === q.partyId);
      for (let i = 0; i < q.seats; i++) {
        seats.push({
          id: seatId++,
          regionId: region.id,
          partyId: q.partyId,
          partyColor: player ? PARTY_COLORS[player.party.partyColor] : '#666',
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

export function voteBill(
  bill: Bill,
  parliament: ParliamentState,
  rulingPlayerId: string,
  oppositionLobbyPower: number  // 0-10 scale
): Bill {
  const updatedBill = { ...bill, seatVotes: {} as Record<number, boolean> };
  let votesFor = 0;
  let votesAgainst = 0;

  for (const seat of parliament.seats) {
    const isRulingSeat = seat.partyId === rulingPlayerId;
    let voteYes: boolean;

    if (isRulingSeat) {
      // 90% loyalty, 10% rebel chance
      voteYes = Math.random() < 0.9;
    } else {
      // Opposition: 10% chance to defect to yes, reduced by lobby power
      const defectChance = Math.max(0.02, 0.1 - oppositionLobbyPower * 0.008);
      voteYes = Math.random() < defectChance;
    }

    updatedBill.seatVotes![seat.id] = voteYes;
    if (voteYes) votesFor++;
    else votesAgainst++;
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
