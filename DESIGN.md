# Democracy Multiplayer — Game Design Document

## Concept
A web-based multiplayer political simulation inspired by Democracy 4. Two players compete:
- **Ruling Party**: Governs the country, sets policies, manages the budget
- **Opposition**: Disrupts, campaigns, and tries to win the next election

## Core Loop
```
Turn N:
  1. Events Phase → random event triggers (recession, scandal, pandemic, etc.)
  2. Ruling Party Phase → spend political capital on policy changes
  3. Resolution Phase → simulation ticks, all effects propagate through the policy graph
  4. Opposition Phase → spend political capital on opposition actions
  5. Polling Phase → voter group satisfaction updates, approval rating shown
  6. Election Check → every 8 turns, election happens
```

## Voter Groups (10)
Each voter has membership in 1-3 groups. Satisfaction 0-100%.

| Group | Key Concerns |
|-------|-------------|
| Workers | Wages, unemployment, labor rights |
| Business Owners | Tax rates, regulation, trade |
| Youth | Education, housing, climate |
| Retirees | Pensions, healthcare, stability |
| Environmentalists | Emissions, renewables, pollution |
| Patriots | Military, immigration, tradition |
| Liberals | Civil rights, press freedom, privacy |
| Religious | Family values, tradition, charity |
| Rural | Agriculture, infrastructure, land rights |
| Urban | Public transport, housing, culture |

Population distribution sums to 100%. Each citizen belongs to 1-3 groups.

## Policies (30)
Each policy has a slider (0-100) and costs budget proportional to its level.

### Economy
1. Income Tax Rate (0-100)
2. Corporate Tax Rate (0-100)
3. Sales Tax / VAT (0-100)
4. Government Spending (0-100)
5. Trade Openness (0-100)
6. Minimum Wage (0-100)

### Welfare
7. Healthcare Funding (0-100)
8. Education Funding (0-100)
9. Pension Spending (0-100)
10. Unemployment Benefits (0-100)
11. Housing Subsidies (0-100)
12. Foreign Aid (0-100)

### Society
13. Immigration Policy (0=closed, 100=open)
14. Civil Rights Level (0-100)
15. Press Freedom (0-100)
16. Drug Policy (0=prohibition, 100=legalization)
17. Gun Control (0=none, 100=strict)
18. Religious Freedom (0-100)

### Environment
19. Carbon Tax (0-100)
20. Renewable Energy Subsidies (0-100)
21. Environmental Regulations (0-100)
22. Public Transport Investment (0-100)

### Security
23. Police Funding (0-100)
24. Military Spending (0-100)
25. Intelligence Budget (0-100)
26. Border Security (0-100)

### Infrastructure
27. Road & Rail Investment (0-100)
28. Technology & Research (0-100)
29. Agriculture Subsidies (0-100)
30. Urban Development (0-100)

## Simulation Variables (derived)
These are computed from policies and affect voter satisfaction:

- **GDP Growth** (-5% to +8%) — from tax rates, trade, spending, tech
- **Unemployment** (0-30%) — from min wage, GDP, trade, education
- **Inflation** (0-20%) — from spending, money supply
- **National Debt** (0-200% GDP) — accumulates from deficit
- **Crime Rate** — from police, unemployment, drug policy, inequality
- **Pollution** — from regulations, carbon tax, industry
- **Equality** — from taxes, welfare, min wage
- **Health Index** — from healthcare, pollution, poverty
- **Education Index** — from education funding, tech investment
- **Freedom Index** — from civil rights, press freedom, surveillance

## Political Capital
- Ruling Party gets **6 PC per turn** (base)
  - +1 if approval > 60%
  - -1 if approval < 30%
- Opposition gets **4 PC per turn** (base)
  - +1 if ruling approval < 40%
  - +1 if they hold > 35% projected vote share
- Moving a policy slider costs 1 PC per 10 points moved
- Opposition actions cost 1-3 PC each

## Opposition Actions

| Action | Cost | Effect |
|--------|------|--------|
| **Filibuster** | 2 PC | Block ONE policy change this turn (ruling party loses the PC they spent) |
| **Campaign** | 1 PC | Target a voter group: +5% opposition support in that group |
| **Propose Alternative** | 2 PC | Publicly propose a policy position. If popular (>50% approval among affected groups), ruling party loses 3% overall approval |
| **Media Attack** | 1 PC | Amplify a negative stat (crime, unemployment, etc.). Doubles its negative approval impact for 2 turns |
| **Coalition Building** | 3 PC | Lock in a voter group's support for 4 turns (they can't swing back to ruling party) |
| **Vote of No Confidence** | 5 PC | If ruling approval < 25%, triggers emergency election. If fails, opposition loses 10% credibility |

## Elections
- Every 8 turns
- Each voter group votes proportionally based on satisfaction
- Ruling party wins if they get >50% of weighted vote
- If opposition wins, players SWAP roles (new dynamic!)
- Game ends after 3 elections (6 "terms" possible) — player with most terms won wins

## Events (random, 1 per turn, 30% chance)
- Economic boom (+GDP), Recession (-GDP), Pandemic (health crisis), Scandal (approval hit), Natural disaster (spending spike), Tech breakthrough (+research), Border crisis (immigration pressure), Energy crisis, Market crash, Cultural shift

## Budget
- Revenue = f(tax rates, GDP, trade)
- Spending = sum of all spending policies
- Deficit = Spending - Revenue → adds to debt
- If debt > 150% GDP: credit downgrade event, -10% to all spending effectiveness
- If debt > 200% GDP: economic crisis, forced austerity

## UI Layout

### Ruling Party View
- **Left sidebar**: Policy categories (accordion)
- **Center**: Policy web / dashboard with key stats
- **Right**: Voter group satisfaction bars
- **Top**: Turn counter, budget, political capital, approval rating
- **Bottom**: Action log / news ticker

### Opposition View
- **Left sidebar**: Available actions
- **Center**: Intelligence view — see all public stats, estimate policy effects
- **Right**: Voter group targeting map
- **Top**: Turn counter, political capital, projected vote share
- **Bottom**: Action log / news ticker

### Shared
- **Lobby**: Create/join game with room code
- **Election screen**: Animated vote counting
- **End game**: Final scoreboard

## Tech Stack
- **Framework**: Next.js 15 + TypeScript
- **Styling**: Tailwind CSS + shadcn/ui
- **Realtime**: Socket.io (ws server in custom Next.js server or separate)
- **State**: Zustand (client) + server-authoritative game state
- **Graphs/Charts**: Recharts or D3.js for policy web visualization
- **DB**: PostgreSQL (Neon) for persistent games, or in-memory for MVP
- **Auth**: Simple room codes for MVP (no auth needed)

## MVP Scope (v0.1)
1. ✅ Game engine with all 30 policies, 10 voter groups, simulation
2. ✅ Turn system with political capital
3. ✅ Ruling party can adjust policies
4. ✅ Opposition can use all 6 actions
5. ✅ Elections every 8 turns with role swap
6. ✅ WebSocket multiplayer (room codes)
7. ✅ Dashboard UI for both roles
8. ✅ Random events
9. ❌ No persistent DB (in-memory game state)
10. ❌ No auth system
11. ❌ No spectator mode (later)
