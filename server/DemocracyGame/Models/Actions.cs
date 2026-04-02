namespace DemocracyGame.Models;

public class OppositionAction
{
    public OppositionActionType Type { get; set; }
    public int Cost { get; set; }
    public string? TargetPolicyId { get; set; }
    public string? TargetGroupId { get; set; }
    public SimVar? TargetSimVar { get; set; }
    public string? ProposedPolicyId { get; set; }
    public int? ProposedValue { get; set; }
    public string? TargetBillId { get; set; }
    public string? TargetRegionId { get; set; }
    public string? Topic { get; set; }
    public ScandalType? ScandalType { get; set; }
    public string? ScandalId { get; set; }
    public string? TargetNationId { get; set; }
    public double? AidAmount { get; set; }
    public int? TargetPledgeIndex { get; set; }
    public string? TargetBotPartyId { get; set; }
}

public class CampaignAction
{
    public CampaignActionType Type { get; set; }
    public int Cost { get; set; }
    public string? TargetRegionId { get; set; }
    public string? TargetGroupId { get; set; }
    public SimVar? TargetSimVar { get; set; }
    public string? Position { get; set; }  // "support" | "oppose"
    public string? PromisePolicyId { get; set; }
    public string? PromiseDirection { get; set; }  // "increase" | "decrease"
}

public class ParliamentAction
{
    public string Type { get; set; } = "";  // "lobby" | "whip" | "public_campaign"
    public string BillId { get; set; } = "";
    public int PcSpent { get; set; }
    public string? TargetPartyId { get; set; }
    public string Direction { get; set; } = "support";  // "support" | "oppose"
}
