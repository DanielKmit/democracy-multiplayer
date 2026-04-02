namespace DemocracyGame.Models;

// ---- Player & Party ----

public enum PlayerRole { Ruling, Opposition }

public enum PartyColor { Red, Blue, Green, Yellow, Orange, Purple, Cyan, Pink }

public enum PartyLogo { Eagle, Rose, Star, Tree, Fist, Dove, Shield, Flame, Scales, Gear, Wheat, Sun }

// ---- Policies ----

public enum PolicyCategory { Economy, Welfare, Society, Environment, Security, Infrastructure }

public enum PolicyLevel { Off, Low, Medium, High, Maximum }

// ---- Simulation ----

public enum SimVar
{
    GdpGrowth, Unemployment, Inflation,
    Crime, ViolentCrime, PropertyCrime, WhiteCollarCrime,
    Pollution, Equality, HealthIndex, EducationIndex,
    FreedomIndex, NationalSecurity, Corruption
}

// ---- Turn Phases ----

public enum TurnPhase
{
    Waiting, PartyCreation, Campaigning, Debate,
    Events, Dilemma, Ruling, BillVoting, Resolution,
    Opposition, Polling, Election, CoalitionNegotiation,
    GovernmentFormation, GameOver
}

// ---- Bills ----

public enum BillStatus { Pending, Drafting, Voting, Passed, Failed, Filibustered, Vetoed, Unconstitutional }

// ---- Cabinet ----

public enum MinistryId { Finance, Interior, Defense, Health, Education, Foreign, Environment, Justice }

// ---- Debate ----

public enum DebateChoice { Attack, Defend, Pivot }

// ---- Situations ----

public enum SituationSeverity { Mild, Moderate, Severe, Critical }
public enum SituationCategory { Economic, Social, Security, Environment }

// ---- Extremism ----

public enum ExtremistGroup { FarLeft, FarRight, Religious, Eco }

// ---- Budget ----

public enum CreditRating { AAA, AA, A, BBB, BB, B, CCC }

// ---- Media ----

public enum MediaBias { Left, Center, Right }

// ---- Opposition Actions ----

public enum OppositionActionType
{
    Filibuster, Campaign, ProposeAlternative, MediaAttack,
    CoalitionBuilding, VoteOfNoConfidence, LobbyVotes,
    ProposeAmendment, TableMotion, QuestionTime,
    ProposeCounterBill, RallyProtest, LeakScandal,
    FormNgoAlliance, SenateVeto, ConstitutionalChallenge,
    DelayTactics, CampaignVisit, RunAds, PlantEvidence,
    SpinScandal, SignTradeDeal, SendForeignAid, AttackBrokenPromise,
    CallEarlyElection, BlockCabinet, InvestigateGovernment,
    FilibusterBill, ProposeAltBudget, MediaCampaignAgainst,
    CoalitionPoaching, EmergencyDebate
}

// ---- Campaign ----

public enum CampaignActionType
{
    CampaignRally, MediaBlitz, VoterPromise, TargetRegion,
    StatePosition, AttackAd, Fundraiser, Endorsement
}

// ---- Scandals ----

public enum ScandalType { Corruption, Personal, Policy }

// ---- Victory ----

public enum VictoryType { Electoral, Economic, Approval, Parliamentary }

// ---- News ----

public enum NewsType { Bill, Situation, Dilemma, Event, Election, Cabinet, General }

// ---- Action Log ----

public enum LogEntryType { Info, Ruling, Opposition, Event, Election, Situation, Dilemma, Cabinet }

// ---- Active Effects ----

public enum EffectType { Event, MediaAttack, Coalition, Filibuster, Dilemma, MediaEvent, VoterGroupEvent }
