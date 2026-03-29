# Democracy Multiplayer - Audit Report

**Date:** 2026-03-29
**Auditor:** Lead Analyst (Code Review + Architecture Audit)
**Version:** Current main branch
**Method:** Full codebase review of engine, UI, networking, and game loop

---

## Critical Bugs (Game-Breaking)

### 1. Coalition Double-Approach Bug — Players CAN approach the same bot party multiple times
- **How to reproduce:** In `CoalitionScreen.tsx`, the `wasRejected` check only looks for offers where `o.rejected === true`, but `submitCoalitionOffer` in `gameHost.ts` never sets `rejected: true` on the offer object when the bot declines. The rejection result is only logged — the original offer object stays with `accepted: false, rejected: false`.
- **Expected:** Once rejected, the bot party should show "❌ Rejected" and be un-clickable.
- **Actual:** The offer silently disappears and the player can spam the same party infinitely, exploiting probability until they accept.
- **Fix:** In `handleAction('submitCoalitionOffer')`, after the acceptance check, push the offer to `coalitionOffers` with `accepted` or `rejected` set correctly.

### 2. Page Refresh = Game Over (No State Persistence)
- **How to reproduce:** Refresh the browser during any phase.
- **Expected:** Game state persists or reconnects.
- **Actual:** Connection lost, game data gone. The `gameState` lives in a module-level `let` variable in `gameHost.ts`. PeerJS connection drops on refresh. No persistence layer.
- **Impact:** Any accidental refresh, tab close, or network hiccup kills the entire game. This is the #1 reason nobody can finish a full playthrough.

### 3. Client Never Receives Host Actions — One-Way Communication
- **How to reproduce:** The client (player 2) joins via PeerJS. Host processes all actions locally via `handleAction()`. But the client only receives state via `broadcastState()` which calls `sendMessage()`. Meanwhile, the client dispatches actions via `sendMessage({ type: 'action', ... })` — but there's **no handler on the host side listening for incoming peer messages and routing them to `handleAction()`**.
- **Expected:** Client sends action → Host receives → Host processes → Host broadcasts updated state.
- **Actual:** Looking at `peer.ts`, `onMessage` sets a handler, but I see no code in the host flow that calls `onMessage()` to listen for client actions. The `gameHost.ts` `handleAction` is called directly by the host. The client sends messages into the void.
- **Impact:** **Multiplayer is fundamentally broken.** Player 2 can see state updates but cannot take any actions. The game is effectively single-player only unless there's connection setup code I'm missing in the page component.

### 4. advancePhase Skips Bill Voting Entirely
- **In `simulation.ts` `advancePhase()`:** After the ruling phase, instead of going to `bill_voting`, it jumps straight to `resolution`:
  ```typescript
  if (state.phase === 'ruling') {
    state.phase = 'resolution';
    return;
  }
  ```
- **In `gameHost.ts` `submitPolicyChanges`:** It calls `advancePhase` twice — once to go to resolution, then immediately to opposition. The `bill_voting` phase is defined in `phaseOrder` but never actually reached.
- **Impact:** The bill voting system exists in the UI but the phase transition completely bypasses it for normal policy changes. Bills submitted via `submitBill` do get voted on inline, but the dedicated `bill_voting` phase is dead code.

### 5. Election Winner Determination Ignores Coalition Seats
- **In `handleEndTurnPhase` (coalition_negotiation end):** The code tries to count coalition seats but the logic is broken — it checks `coalitionOffers` for accepted offers, but offers aren't consistently tracked with acceptance state (see Bug #1). Additionally, the fallback just picks the human player with most seats, ignoring bots entirely.
- **Expected:** Player with most seats + coalition partners forms government.
- **Actual:** The first player often wins by default due to initial seat allocation bias (host gets 32%, client gets 28%).

---

## Major Issues (Core Features Broken/Missing)

### 1. Ruling Party Uses Direct Policy Changes, Not Bills
- The DESIGN.md and the bills system suggest policies should change through parliamentary bills that all 6 parties vote on.
- **Actual:** `submitPolicyChanges` directly modifies `state.policies` without any parliamentary vote. The `submitBill` action exists separately but is an optional side-channel, not the primary mechanism.
- **Impact:** The entire parliament / multi-party voting mechanic is optional, not core. The ruling party can change any policy unilaterally if they have enough PC.

### 2. Bot Parties Are Passive Seat-Fillers
- Bots never:
  - Propose their own bills
  - Take any autonomous actions between turns
  - Make coalition demands that expire
  - Switch allegiance dynamically
  - Campaign or lobby
- They only: (a) vote on bills when submitted by humans, (b) accept/reject coalition offers.
- **Impact:** The 4 bot parties feel like decoration. In Democracy 4, opposition parties are active adversaries. Here they're purely reactive.

### 3. Opposition Can't Propose Bills Through Parliament
- The `submitBill` action technically works for opposition during `opposition` phase, but:
  - The OppositionActionPanel doesn't have a "propose bill" UI
  - The OppositionDashboard has a separate action list that doesn't include bill proposal
  - The `propose_counter_bill` opposition action doesn't actually create a Bill object — it just does an inline popularity check
- **Impact:** Opposition can never actually change policy through parliament. They can only harass the ruling party.

### 4. Campaign Phase — Both Players Submit Independently, No Turn Synchronization
- In `submitCampaignActions`, after one player submits, the state updates immediately. There's no waiting for the other player.
- The campaign phase doesn't track which players have submitted.
- **Impact:** One player can submit early, see results in polling, and the other's actions don't stack properly. No true simultaneous action.

### 5. `poachCoalitionPartner` — Handler Missing
- `useGameActions.ts` exposes `poachCoalitionPartner` but `gameHost.ts` has no `case 'poachCoalitionPartner'` handler.
- **Impact:** Coalition poaching (designed feature where opponents steal your partners) silently does nothing.

### 6. Dilemma Resolution — Only Ruling Party Can Resolve
- In `resolveDilemma`, there's a check: `if (!ruling || ruling.id !== playerId) return;`
- During pre-election campaign phase, both players are set to `role: 'opposition'` (neither rules yet).
- **Impact:** If a dilemma triggers during campaign phase, nobody can resolve it. The game could soft-lock.

### 7. Shadow Cabinet — No `appointShadowMinister` Handler
- `useGameActions.ts` exposes `appointShadowMinister` but `gameHost.ts` has no handler for it.
- The shadow cabinet array exists in state but is always null.
- **Impact:** The entire shadow cabinet mechanic (opposition PC bonuses from monitoring failing ministries) is dead.

---

## Missing Features vs Democracy 4

### 1. No Voter Group Membership Simulation
- Democracy 4 has individual simulated voters who belong to multiple overlapping groups. When you change a policy, you can see specific voters switch allegiance.
- **Here:** Voter groups are abstract percentages. No individual voter simulation. You can't see "John the Worker-Retiree is now angry."

### 2. No Policy Implementation Delay
- Democracy 4: Policies take 2-4 turns to fully take effect (gradual implementation).
- **Here:** All policy changes are instant. Change healthcare 25→75 and health index jumps immediately.
- The `delayedPolicies` system exists but is only used by the opposition's `delay_tactics` action, not for natural policy implementation.

### 3. No Voter Cynicism / Complacency
- Democracy 4: Happy voters become complacent (don't vote). Angry voters are motivated. Cynical voters check out entirely.
- **Here:** Satisfaction directly converts to vote share. No turnout modeling.

### 4. No Policy Inertia / Momentum
- Democracy 4: Rapidly changing policies back and forth has costs (instability, voter distrust).
- **Here:** You can flip policies wildly every turn with zero consequence beyond PC cost.

### 5. No Pledges / Promises System
- Democracy 4: You can make election promises that you must fulfill or face credibility loss.
- **Here:** Campaign promises (`voter_promise` action) just add flat bonuses. No tracking, no consequences for breaking them.

### 6. No Minister Competence Effects
- Ministers exist but their competence only affects PC generation. In Democracy 4, minister effectiveness affects policy implementation speed and effectiveness.

### 7. No Assassination Screen/Consequence
- Assassination is checked but there's no dedicated UI screen for it. If the leader is assassinated, it just triggers a snap election with a log message.

### 8. No Debt Crisis Forced Austerity
- The DESIGN.md says debt > 200% GDP should force austerity, but the implementation just logs a warning. No actual forced policy changes.

### 9. No Spectator Mode
- Listed as future in DESIGN.md but worth noting.

### 10. No Save/Load Game
- No persistence at all. Even the room code is ephemeral.

### 11. No Term Limits / Multiple Election Cycles Feeling Different
- Democracy 4: Each term feels different because of accumulated policy effects, voter memory, and new challenges.
- **Here:** Each turn cycle feels the same. Voters have no memory of previous terms.

---

## Logic Problems (Things That Don't Make Sense)

### 1. Initial Parliament Seats Are Pre-Assigned Before First Election
- Both human players get fixed seat shares (32% and 28%) plus bots get fixed shares — before any election happens.
- **Problem:** Why do parties have parliamentary seats before the first election? The game starts with a campaign phase leading to an election, but the parliament hemicycle already shows seats allocated.

### 2. Pre-Election "Caretaker" Phase — Both Players Are Opposition
- After party creation, both players are set to `role: 'opposition'`.
- **Problem:** The UI uses `myRole` to determine views. During campaign phase this works, but any role-dependent logic (dilemmas, events that check for ruling party) breaks.

### 3. Vote Share Calculation Gives Bots Unrealistic Shares
- `computeVoteShares` uses `Math.max(1, satisfaction)` to avoid zero-division, meaning even wildly unpopular parties get vote share.
- With 6 parties (2 human + 4 bot) and similar satisfaction scores, human players can struggle to get above 25% each. Bot parties collectively eat ~40% of the vote.
- **Problem:** This makes it very hard for either human player to get a decisive victory. Elections feel like they always produce fractured parliaments.

### 4. Policy Cost Is PC-Per-Step, Not Per-10-Points
- `PolicyCard.tsx` uses stepped levels (Off/Low/Medium/High/Maximum) with 1 PC per step.
- `applyPolicyChanges` in `simulation.ts` uses `Math.ceil(diff / 10)` — per 10 numerical points.
- **Problem:** The UI shows 1 PC per step (stepping from Low to High = 2 PC), but the engine calculates based on numerical values (25 → 75 = 50 points = 5 PC). The costs displayed in the UI don't match engine costs.

### 5. Situation Trigger: Debt Crisis Doesn't Check Debt
- `debt_crisis` triggers when `sim.gdpGrowth < -2`, not when debt is actually high.
- **Expected:** Debt crisis should trigger from high debt-to-GDP ratio.
- **Actual:** It triggers from any severe recession regardless of fiscal health.

### 6. Budget Revenue Ignores VAT/Sales Tax
- DESIGN.md lists 30 policies including "Sales Tax / VAT" but this policy doesn't exist in the actual `POLICIES` array.
- The budget model has no sales tax revenue component.

### 7. Event Approval Impact Applied Every Recalculation
- In `recalculate()`, event approval impacts are applied to the ruling party's approval on every recalculation call, not just once when the event fires.
- **Problem:** If `recalculate()` is called multiple times per turn (and it is — after policy changes, after opposition actions, after campaign actions), the approval impact stacks incorrectly.

### 8. NGO Alliances Never Decay
- Once formed, NGO alliances give a permanent +3% bonus forever. No conditions for them to break.
- **Problem:** Opposition can stack 3 NGO alliances and get permanent +9% with key groups for the rest of the game.

### 9. Campaign Bonuses Never Reset Between Elections
- `campaignBonuses` is reset after the first election, but the `activeEffects` from campaign actions (with `turnsRemaining: 99`) persist forever.
- **Problem:** Campaign effects from the first election carry over permanently.

---

## Minor Issues (Polish, UX, etc.)

### 1. Policy Dropdown in Coalition Screen Only Shows First 20 Policies
- `POLICIES.slice(0, 20)` in `CoalitionScreen.tsx` — last 10 policies (security + infrastructure) are not available as coalition promises.

### 2. Opposition Dashboard Shows 6 Actions (Old), OppositionActionPanel Shows Full Set
- Two different opposition UI components exist. `OppositionDashboard.tsx` has the old simple 6-action list. `OppositionActionPanel.tsx` has the complete categorized system. The game uses `OppositionActionPanel` in the main layout, but `OppositionDashboard` also exists and could cause confusion.

### 3. No Visual Feedback When Policy Change Has Immediate Impact
- Change income tax and nothing visually updates until you submit and the turn advances. Would be better to show projected impact in real-time.

### 4. News Ticker Truncated to 30 Items
- News items are capped at 30. In a long game, earlier news is lost. No way to view history.

### 5. Coalition Timer Auto-Ends at 0
- 60-second timer for coalition negotiation auto-submits. If you're mid-negotiation, tough luck.

### 6. Situation Names Show Raw IDs in UI
- `{sit.id.replace(/_/g, ' ')}` — situations show IDs like "debt crisis" instead of proper names. Should use `getSituationById(sit.id)?.name`.

### 7. No Tooltip/Help System
- New players have no way to understand what sim vars mean, how voter satisfaction works, or what effects policies have beyond the tiny effect labels.

### 8. `usedDilemmas` Set Is Module-Level (Shared Across Games)
- If you play two games in the same session, dilemmas used in game 1 won't appear in game 2. The `usedDilemmas` set persists across game resets.

### 9. Event Counter Is Module-Level
- Same issue: `eventCounter` in `events.ts` never resets between games.

### 10. No Sound/Music
- Pure silent experience. No audio feedback for elections, bills passing, crises, etc.

### 11. Map Component Not Audited for Interactivity
- The `NovariMap` component exists but map interactivity (clicking regions, seeing regional data) wasn't verifiable from code alone.

### 12. `bill_voting` Phase Has a Handler But Is Unreachable
- `handleEndTurnPhase` has a `gameState.phase === 'bill_voting'` case, but since `advancePhase` skips from ruling → resolution, this code never executes.

---

## What Actually Works Well

### 1. Comprehensive Policy System
- 30 well-designed policies across 6 categories with realistic trade-offs. Every policy has winners and losers. The design philosophy of "nobody likes taxes on themselves" is smart and creates genuine tension.

### 2. Sophisticated Budget Model
- The Laffer curve for tax revenue, credit ratings, interest rates, corruption leakage — this is way more realistic than most political games. The budget feels like it could be real.

### 3. Rich Situation System
- 32 situations with trigger conditions, cascading effects, and voter impacts. Debt crisis → brain drain cascading is excellent design. Situations feel meaningful.

### 4. Diverse Dilemma System
- 19 well-written dilemmas with regional effects, policy effects, and genuine trade-offs. These feel like Democracy 4 quality.

### 5. Multi-Party Parliament Voting
- When bills actually go through parliament, the voting system works well. Bot parties vote based on ideology alignment with realistic rebel chances. Per-party vote breakdowns are shown.

### 6. Per-Party Voter Satisfaction Model
- The satisfaction system accounts for policy alignment, ideology matching, simulation variable concerns, and active effects. It's a solid foundation.

### 7. Regional Diversity
- 7 distinct regions with demographics, key industries, dominant voter groups, and policy weights. Novaria feels like a real country.

### 8. Extremism System
- 4 extremist groups that grow based on policy failures, with assassination mechanics. Creative and adds stakes.

### 9. Clean Build — No Compilation Errors
- The project builds successfully with `next build`. TypeScript compiles cleanly. No runtime errors visible in the build process.

### 10. Professional UI Design
- Glass-card aesthetics, proper color systems, compact layout that fits a lot of info on screen. The TopBar, polling summary, and election screens look polished.

### 11. Opposition Action Variety
- 16+ opposition actions across parliamentary, public, blocking, and campaign categories. Much richer than the original 6 in DESIGN.md.

---

## Priority Fix Recommendations

### P0 (Ship-Blockers)
1. **Fix multiplayer communication** — Add incoming message handler on host side
2. **Fix coalition offer tracking** — Set `accepted`/`rejected` on the offer object
3. **Route policy changes through bills** — Make parliament voting the primary mechanism
4. **Add state persistence** — At minimum, localStorage backup with reconnection

### P1 (Core Experience)
5. **Make bot parties active** — At least have them propose 1 bill per turn
6. **Fix policy cost UI mismatch** — Align PolicyCard display with engine calculation
7. **Implement `poachCoalitionPartner`** and `appointShadowMinister` handlers
8. **Fix event approval stacking** — Apply once, not on every recalculate

### P2 (Game Depth)
9. **Add policy implementation delay** — Use existing `delayedPolicies` system
10. **Add voter turnout modeling**
11. **Fix debt crisis trigger condition**
12. **Reset module-level state between games**

---

## Summary

The **game engine and simulation model are excellent** — possibly the best part of the project. The policy system, budget model, situations, and dilemmas are genuinely well-designed with realistic trade-offs.

The **critical issues are in the game flow and networking layer**: multiplayer communication appears broken, the bill/parliament system is bypassed, coalition tracking has bugs, and there's no state persistence. The bot parties are beautifully defined but do nothing autonomously.

**Bottom line:** This is ~70% of a great game. The foundation (simulation, policies, voters, regions) is solid. The superstructure (multiplayer, game loop, phase transitions, bot AI) needs significant work to deliver a playable experience end-to-end.
