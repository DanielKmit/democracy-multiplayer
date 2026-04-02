using DemocracyGame.Models;

namespace DemocracyGame.Data;

/// <summary>
/// Pool of 20 politicians available for cabinet appointments.
/// Port of politicians.ts.
/// </summary>
public static class PoliticianData
{
    public static readonly Politician[] Pool = new Politician[]
    {
        new() { Id = "pol_1", Name = "Elena Voss", Competence = 9, Loyalty = 6, EconomicLean = 45, SocialLean = 70, Specialty = MinistryId.Finance, AvatarColor = "#3B82F6", Initials = "EV" },
        new() { Id = "pol_2", Name = "Marcus Stein", Competence = 7, Loyalty = 8, EconomicLean = 60, SocialLean = 40, Specialty = MinistryId.Defense, AvatarColor = "#EF4444", Initials = "MS" },
        new() { Id = "pol_3", Name = "Anja Krüger", Competence = 8, Loyalty = 7, EconomicLean = 35, SocialLean = 75, Specialty = MinistryId.Education, AvatarColor = "#22C55E", Initials = "AK" },
        new() { Id = "pol_4", Name = "Friedrich Holt", Competence = 6, Loyalty = 9, EconomicLean = 55, SocialLean = 35, Specialty = MinistryId.Interior, AvatarColor = "#F97316", Initials = "FH" },
        new() { Id = "pol_5", Name = "Lena Berger", Competence = 8, Loyalty = 5, EconomicLean = 30, SocialLean = 80, Specialty = MinistryId.Environment, AvatarColor = "#06B6D4", Initials = "LB" },
        new() { Id = "pol_6", Name = "Otto Richter", Competence = 7, Loyalty = 7, EconomicLean = 70, SocialLean = 50, Specialty = MinistryId.Finance, AvatarColor = "#A855F7", Initials = "OR" },
        new() { Id = "pol_7", Name = "Clara Neumann", Competence = 9, Loyalty = 4, EconomicLean = 40, SocialLean = 85, Specialty = MinistryId.Justice, AvatarColor = "#EC4899", Initials = "CN" },
        new() { Id = "pol_8", Name = "Hans Weber", Competence = 5, Loyalty = 10, EconomicLean = 50, SocialLean = 45, Specialty = MinistryId.Defense, AvatarColor = "#EAB308", Initials = "HW" },
        new() { Id = "pol_9", Name = "Sophia Dahl", Competence = 8, Loyalty = 6, EconomicLean = 25, SocialLean = 65, Specialty = MinistryId.Health, AvatarColor = "#14B8A6", Initials = "SD" },
        new() { Id = "pol_10", Name = "Viktor Braun", Competence = 6, Loyalty = 8, EconomicLean = 75, SocialLean = 30, Specialty = MinistryId.Interior, AvatarColor = "#6366F1", Initials = "VB" },
        new() { Id = "pol_11", Name = "Ingrid Fuchs", Competence = 7, Loyalty = 7, EconomicLean = 45, SocialLean = 60, Specialty = MinistryId.Foreign, AvatarColor = "#F43F5E", Initials = "IF" },
        new() { Id = "pol_12", Name = "Karl Engel", Competence = 9, Loyalty = 3, EconomicLean = 20, SocialLean = 90, Specialty = MinistryId.Justice, AvatarColor = "#84CC16", Initials = "KE" },
        new() { Id = "pol_13", Name = "Marta Scholz", Competence = 6, Loyalty = 9, EconomicLean = 65, SocialLean = 40, Specialty = MinistryId.Finance, AvatarColor = "#D946EF", Initials = "MS" },
        new() { Id = "pol_14", Name = "Peter Winkler", Competence = 8, Loyalty = 5, EconomicLean = 50, SocialLean = 55, Specialty = MinistryId.Education, AvatarColor = "#0EA5E9", Initials = "PW" },
        new() { Id = "pol_15", Name = "Greta Hoffman", Competence = 10, Loyalty = 3, EconomicLean = 15, SocialLean = 85, Specialty = MinistryId.Environment, AvatarColor = "#10B981", Initials = "GH" },
        new() { Id = "pol_16", Name = "Dieter Lang", Competence = 5, Loyalty = 10, EconomicLean = 55, SocialLean = 35, Specialty = MinistryId.Defense, AvatarColor = "#F59E0B", Initials = "DL" },
        new() { Id = "pol_17", Name = "Anna Ritter", Competence = 7, Loyalty = 6, EconomicLean = 40, SocialLean = 70, Specialty = MinistryId.Health, AvatarColor = "#8B5CF6", Initials = "AR" },
        new() { Id = "pol_18", Name = "Lukas Bauer", Competence = 8, Loyalty = 7, EconomicLean = 60, SocialLean = 50, Specialty = MinistryId.Foreign, AvatarColor = "#FB923C", Initials = "LB" },
        new() { Id = "pol_19", Name = "Eva Schreiber", Competence = 6, Loyalty = 8, EconomicLean = 35, SocialLean = 55, Specialty = MinistryId.Interior, AvatarColor = "#2DD4BF", Initials = "ES" },
        new() { Id = "pol_20", Name = "Wolfgang Meier", Competence = 7, Loyalty = 9, EconomicLean = 70, SocialLean = 25, Specialty = MinistryId.Justice, AvatarColor = "#E11D48", Initials = "WM" },
    };

    public static List<Politician> GetInitialPool() => Pool.Select(p => new Politician
    {
        Id = p.Id, Name = p.Name, Competence = p.Competence, Loyalty = p.Loyalty,
        EconomicLean = p.EconomicLean, SocialLean = p.SocialLean,
        Specialty = p.Specialty, AvatarColor = p.AvatarColor, Initials = p.Initials,
    }).ToList();

    /// <summary>Effective competence = base + 3 if specialty matches ministry (max 10).</summary>
    public static int GetEffectiveCompetence(Politician pol, MinistryId ministry) =>
        Math.Min(10, pol.Competence + (pol.Specialty == ministry ? 3 : 0));

    /// <summary>
    /// Check if a politician would resign based on ideology distance.
    /// Returns true if ideological distance > loyalty * 8.
    /// </summary>
    public static bool WouldResign(Politician pol, Dictionary<string, int> policies)
    {
        if (pol.Loyalty >= 7) return false;

        var avgEcon = (policies.GetValueOrDefault("income_tax", 40)
            + policies.GetValueOrDefault("corporate_tax", 30)
            + policies.GetValueOrDefault("minimum_wage", 40)
            + policies.GetValueOrDefault("govt_spending", 50)) / 4.0;
        var avgSocial = (policies.GetValueOrDefault("civil_rights", 60)
            + policies.GetValueOrDefault("press_freedom", 65)
            + policies.GetValueOrDefault("immigration", 50)
            + policies.GetValueOrDefault("drug_policy", 30)) / 4.0;

        var econDist = Math.Abs(avgEcon - pol.EconomicLean);
        var socialDist = Math.Abs(avgSocial - pol.SocialLean);
        var totalDist = econDist + socialDist;

        return totalDist > pol.Loyalty * 8;
    }
}
