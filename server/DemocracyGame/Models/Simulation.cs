namespace DemocracyGame.Models;

public class SimulationState
{
    public double GdpGrowth { get; set; } = 2.0;
    public double Unemployment { get; set; } = 8.0;
    public double Inflation { get; set; } = 3.0;
    public double Crime { get; set; } = 40;
    public double ViolentCrime { get; set; } = 35;
    public double PropertyCrime { get; set; } = 40;
    public double WhiteCollarCrime { get; set; } = 30;
    public double Pollution { get; set; } = 50;
    public double Equality { get; set; } = 50;
    public double HealthIndex { get; set; } = 50;
    public double EducationIndex { get; set; } = 50;
    public double FreedomIndex { get; set; } = 50;
    public double NationalSecurity { get; set; } = 50;
    public double Corruption { get; set; } = 30;

    public double this[SimVar key]
    {
        get => key switch
        {
            SimVar.GdpGrowth => GdpGrowth,
            SimVar.Unemployment => Unemployment,
            SimVar.Inflation => Inflation,
            SimVar.Crime => Crime,
            SimVar.ViolentCrime => ViolentCrime,
            SimVar.PropertyCrime => PropertyCrime,
            SimVar.WhiteCollarCrime => WhiteCollarCrime,
            SimVar.Pollution => Pollution,
            SimVar.Equality => Equality,
            SimVar.HealthIndex => HealthIndex,
            SimVar.EducationIndex => EducationIndex,
            SimVar.FreedomIndex => FreedomIndex,
            SimVar.NationalSecurity => NationalSecurity,
            SimVar.Corruption => Corruption,
            _ => throw new ArgumentOutOfRangeException(nameof(key))
        };
        set
        {
            switch (key)
            {
                case SimVar.GdpGrowth: GdpGrowth = value; break;
                case SimVar.Unemployment: Unemployment = value; break;
                case SimVar.Inflation: Inflation = value; break;
                case SimVar.Crime: Crime = value; break;
                case SimVar.ViolentCrime: ViolentCrime = value; break;
                case SimVar.PropertyCrime: PropertyCrime = value; break;
                case SimVar.WhiteCollarCrime: WhiteCollarCrime = value; break;
                case SimVar.Pollution: Pollution = value; break;
                case SimVar.Equality: Equality = value; break;
                case SimVar.HealthIndex: HealthIndex = value; break;
                case SimVar.EducationIndex: EducationIndex = value; break;
                case SimVar.FreedomIndex: FreedomIndex = value; break;
                case SimVar.NationalSecurity: NationalSecurity = value; break;
                case SimVar.Corruption: Corruption = value; break;
                default: throw new ArgumentOutOfRangeException(nameof(key));
            }
        }
    }
}

public class BudgetState
{
    public double Revenue { get; set; }
    public double Spending { get; set; }
    public double InterestPayments { get; set; }
    public double Deficit { get; set; }
    public double Balance { get; set; }
    public double DebtTotal { get; set; }
    public double DebtToGdp { get; set; }
    public CreditRating CreditRating { get; set; } = CreditRating.A;
    public double InterestRate { get; set; }
    public bool CreditDowngrade { get; set; }
}

public class TurnSnapshot
{
    public int Turn { get; set; }
    public double Approval { get; set; }
    public double Gdp { get; set; }
    public double Unemployment { get; set; }
    public double DebtToGdp { get; set; }
}
