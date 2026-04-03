using DemocracyGame.Models;

namespace DemocracyGame.Data;

public static class BillTemplateData
{
    private static readonly Dictionary<string, BillTemplate> _byId;

    static BillTemplateData()
    {
        _byId = All.ToDictionary(b => b.Id);
    }

    public static BillTemplate? GetById(string id) => _byId.TryGetValue(id, out var t) ? t : null;

    public static readonly List<BillTemplate> All = new()
    {
        new BillTemplate
        {
            Id = "bill_ubi",
            Name = "Universal Basic Income",
            Description = "Provide every citizen a guaranteed monthly income regardless of employment status.",
            Category = "economy",
            Cost = 3,
            ConstitutionalScore = 75,
            PolicyChanges = new()
            {
                new BillPolicyChange { PolicyId = "unemployment_benefits", TargetValue = 90 },
                new BillPolicyChange { PolicyId = "govt_spending", TargetValue = 80 },
            },
        },
        new BillTemplate
        {
            Id = "bill_ubi_basic",
            Name = "Basic Income Pilot",
            Description = "Small-scale basic income trial in select regions — $500/month for qualifying households.",
            Category = "economy",
            Cost = 2,
            ConstitutionalScore = 85,
            PolicyChanges = new()
            {
                new BillPolicyChange { PolicyId = "unemployment_benefits", TargetValue = 70 },
            },
        },
        new BillTemplate
        {
            Id = "bill_wealth_tax",
            Name = "Progressive Wealth Tax",
            Description = "Annual tax on net worth above $10 million to fund public services.",
            Category = "economy",
            Cost = 2,
            ConstitutionalScore = 55,
            PolicyChanges = new()
            {
                new BillPolicyChange { PolicyId = "income_tax", TargetValue = 75 },
            },
        },
        new BillTemplate
        {
            Id = "bill_flat_wealth_tax",
            Name = "Flat Wealth Tax",
            Description = "A flat 1% annual tax on all assets above $1 million — simpler than progressive brackets.",
            Category = "economy",
            Cost = 2,
            ConstitutionalScore = 60,
            PolicyChanges = new()
            {
                new BillPolicyChange { PolicyId = "income_tax", TargetValue = 60 },
            },
        },
        new BillTemplate
        {
            Id = "bill_corporate_tax_reform",
            Name = "Corporate Tax Reform",
            Description = "Close loopholes and raise effective corporate tax rate to fund infrastructure.",
            Category = "economy",
            Cost = 2,
            ConstitutionalScore = 80,
            PolicyChanges = new()
            {
                new BillPolicyChange { PolicyId = "corporate_tax", TargetValue = 65 },
            },
        },
        new BillTemplate
        {
            Id = "bill_corporate_tax_cut",
            Name = "Corporate Tax Cut",
            Description = "Slash corporate tax rate to 15% to attract foreign investment and boost hiring.",
            Category = "economy",
            Cost = 2,
            ConstitutionalScore = 85,
            PolicyChanges = new()
            {
                new BillPolicyChange { PolicyId = "corporate_tax", TargetValue = 20 },
            },
        },
        new BillTemplate
        {
            Id = "bill_corporate_tax_increase",
            Name = "Corporate Tax Increase",
            Description = "Raise corporate tax to 35% to fund social programs and reduce inequality.",
            Category = "economy",
            Cost = 2,
            ConstitutionalScore = 75,
            PolicyChanges = new()
            {
                new BillPolicyChange { PolicyId = "corporate_tax", TargetValue = 80 },
            },
        },
        new BillTemplate
        {
            Id = "bill_minimum_wage_increase",
            Name = "National Minimum Wage Increase",
            Description = "Raise the national minimum wage by 40% to a living wage standard.",
            Category = "economy",
            Cost = 2,
            ConstitutionalScore = 85,
            PolicyChanges = new()
            {
                new BillPolicyChange { PolicyId = "minimum_wage", TargetValue = 75 },
            },
        },
        new BillTemplate
        {
            Id = "bill_minimum_wage_local",
            Name = "Local Minimum Wage Flexibility",
            Description = "Allow regions to set their own minimum wage based on local cost of living.",
            Category = "economy",
            Cost = 1,
            ConstitutionalScore = 80,
            PolicyChanges = new()
            {
                new BillPolicyChange { PolicyId = "minimum_wage", TargetValue = 55 },
            },
        },
        new BillTemplate
        {
            Id = "bill_minimum_wage_indexed",
            Name = "Inflation-Indexed Minimum Wage",
            Description = "Tie minimum wage to inflation so it automatically adjusts each year.",
            Category = "economy",
            Cost = 2,
            ConstitutionalScore = 88,
            PolicyChanges = new()
            {
                new BillPolicyChange { PolicyId = "minimum_wage", TargetValue = 65 },
            },
        },
        new BillTemplate
        {
            Id = "bill_flat_tax",
            Name = "Flat Tax Act",
            Description = "Replace progressive income tax with a single flat rate of 20% for all earners.",
            Category = "economy",
            Cost = 2,
            ConstitutionalScore = 70,
            PolicyChanges = new()
            {
                new BillPolicyChange { PolicyId = "income_tax", TargetValue = 30 },
            },
        },
        new BillTemplate
        {
            Id = "bill_free_trade",
            Name = "Free Trade Expansion",
            Description = "Eliminate tariffs and open borders to international commerce.",
            Category = "economy",
            Cost = 2,
            ConstitutionalScore = 75,
            PolicyChanges = new()
            {
                new BillPolicyChange { PolicyId = "trade_openness", TargetValue = 90 },
            },
        },
        new BillTemplate
        {
            Id = "bill_protectionism",
            Name = "Trade Protectionism Act",
            Description = "Impose tariffs on foreign goods to protect domestic industries and jobs.",
            Category = "economy",
            Cost = 2,
            ConstitutionalScore = 75,
            PolicyChanges = new()
            {
                new BillPolicyChange { PolicyId = "trade_openness", TargetValue = 25 },
            },
        },
        new BillTemplate
        {
            Id = "bill_tech_investment",
            Name = "National Tech Investment Fund",
            Description = "Create a sovereign tech fund to invest in AI, biotech, and green energy startups.",
            Category = "economy",
            Cost = 3,
            ConstitutionalScore = 85,
            PolicyChanges = new()
            {
                new BillPolicyChange { PolicyId = "tech_research", TargetValue = 80 },
                new BillPolicyChange { PolicyId = "govt_spending", TargetValue = 65 },
            },
        },
        new BillTemplate
        {
            Id = "bill_austerity",
            Name = "Austerity Measures Act",
            Description = "Slash government spending across the board to reduce national debt.",
            Category = "economy",
            Cost = 2,
            ConstitutionalScore = 80,
            PolicyChanges = new()
            {
                new BillPolicyChange { PolicyId = "govt_spending", TargetValue = 20 },
            },
        },
        new BillTemplate
        {
            Id = "bill_bank_regulation",
            Name = "Banking Regulation Act",
            Description = "Impose strict regulations on banks including leverage limits and stress tests.",
            Category = "economy",
            Cost = 2,
            ConstitutionalScore = 80,
            PolicyChanges = new()
            {
                new BillPolicyChange { PolicyId = "corporate_tax", TargetValue = 50 },
            },
        },
        new BillTemplate
        {
            Id = "bill_bank_moderate",
            Name = "Moderate Banking Oversight",
            Description = "Light-touch regulation with quarterly reporting and voluntary stress tests.",
            Category = "economy",
            Cost = 1,
            ConstitutionalScore = 90,
            PolicyChanges = new()
            {
                new BillPolicyChange { PolicyId = "corporate_tax", TargetValue = 40 },
            },
        },
        new BillTemplate
        {
            Id = "bill_bank_deregulation",
            Name = "Banking Deregulation",
            Description = "Remove post-crisis banking regulations to unleash lending and growth.",
            Category = "economy",
            Cost = 2,
            ConstitutionalScore = 70,
            PolicyChanges = new()
            {
                new BillPolicyChange { PolicyId = "corporate_tax", TargetValue = 20 },
            },
        },
        new BillTemplate
        {
            Id = "bill_pension_reform",
            Name = "Public Pension Reform",
            Description = "Restructure the pension system: raise retirement age, increase contributions.",
            Category = "economy",
            Cost = 2,
            ConstitutionalScore = 70,
            PolicyChanges = new()
            {
                new BillPolicyChange { PolicyId = "pensions", TargetValue = 40 },
            },
        },
        new BillTemplate
        {
            Id = "bill_pension_privatize",
            Name = "Pension Privatization",
            Description = "Allow workers to invest pension contributions in private market accounts.",
            Category = "economy",
            Cost = 2,
            ConstitutionalScore = 60,
            PolicyChanges = new()
            {
                new BillPolicyChange { PolicyId = "pensions", TargetValue = 25 },
            },
        },
        new BillTemplate
        {
            Id = "bill_pension_expand",
            Name = "Pension Expansion Act",
            Description = "Lower retirement age and increase pension payments by 30%.",
            Category = "economy",
            Cost = 3,
            ConstitutionalScore = 80,
            PolicyChanges = new()
            {
                new BillPolicyChange { PolicyId = "pensions", TargetValue = 85 },
                new BillPolicyChange { PolicyId = "govt_spending", TargetValue = 70 },
            },
        },
        new BillTemplate
        {
            Id = "bill_stimulus",
            Name = "Economic Stimulus Package",
            Description = "Emergency spending to boost consumer demand and create jobs during downturn.",
            Category = "economy",
            Cost = 3,
            ConstitutionalScore = 85,
            PolicyChanges = new()
            {
                new BillPolicyChange { PolicyId = "govt_spending", TargetValue = 80 },
            },
        },
        new BillTemplate
        {
            Id = "bill_infrastructure",
            Name = "National Infrastructure Act",
            Description = "Invest $500 billion in roads, bridges, broadband, and public transit over 10 years.",
            Category = "economy",
            Cost = 3,
            ConstitutionalScore = 90,
            PolicyChanges = new()
            {
                new BillPolicyChange { PolicyId = "public_transport", TargetValue = 75 },
                new BillPolicyChange { PolicyId = "govt_spending", TargetValue = 70 },
            },
        },
        new BillTemplate
        {
            Id = "bill_small_business",
            Name = "Small Business Support Act",
            Description = "Tax credits, low-interest loans, and reduced regulations for businesses under 50 employees.",
            Category = "economy",
            Cost = 2,
            ConstitutionalScore = 90,
            PolicyChanges = new()
            {
                new BillPolicyChange { PolicyId = "corporate_tax", TargetValue = 35 },
            },
        },
        new BillTemplate
        {
            Id = "bill_crypto_regulation",
            Name = "Cryptocurrency Regulation Act",
            Description = "Regulate cryptocurrency exchanges, require KYC, and tax crypto gains.",
            Category = "economy",
            Cost = 2,
            ConstitutionalScore = 70,
            PolicyChanges = new()
            {
                new BillPolicyChange { PolicyId = "tech_research", TargetValue = 55 },
                new BillPolicyChange { PolicyId = "corporate_tax", TargetValue = 50 },
            },
        },
        new BillTemplate
        {
            Id = "bill_stock_tax",
            Name = "Stock Transaction Tax",
            Description = "Tax every stock trade at 0.1% to curb speculation and fund public services.",
            Category = "economy",
            Cost = 2,
            ConstitutionalScore = 65,
            PolicyChanges = new()
            {
                new BillPolicyChange { PolicyId = "corporate_tax", TargetValue = 55 },
            },
        },
        new BillTemplate
        {
            Id = "bill_capital_gains",
            Name = "Capital Gains Tax Reform",
            Description = "Tax capital gains at the same rate as income — no more preferential treatment.",
            Category = "economy",
            Cost = 2,
            ConstitutionalScore = 70,
            PolicyChanges = new()
            {
                new BillPolicyChange { PolicyId = "income_tax", TargetValue = 65 },
            },
        },
        new BillTemplate
        {
            Id = "bill_estate_tax",
            Name = "Estate Tax Increase",
            Description = "Tax inherited wealth above $5 million at 40% to reduce dynastic inequality.",
            Category = "economy",
            Cost = 2,
            ConstitutionalScore = 65,
            PolicyChanges = new()
            {
                new BillPolicyChange { PolicyId = "income_tax", TargetValue = 60 },
            },
        },
        new BillTemplate
        {
            Id = "bill_vat_increase",
            Name = "VAT Increase",
            Description = "Raise value-added tax from 15% to 20% to increase government revenue.",
            Category = "economy",
            Cost = 1,
            ConstitutionalScore = 85,
            PolicyChanges = new()
            {
                new BillPolicyChange { PolicyId = "income_tax", TargetValue = 55 },
            },
        },
        new BillTemplate
        {
            Id = "bill_vat_cut",
            Name = "VAT Reduction",
            Description = "Cut value-added tax to 10% to reduce consumer prices and boost spending.",
            Category = "economy",
            Cost = 2,
            ConstitutionalScore = 85,
            PolicyChanges = new()
            {
                new BillPolicyChange { PolicyId = "income_tax", TargetValue = 30 },
            },
        },
        new BillTemplate
        {
            Id = "bill_universal_healthcare",
            Name = "Universal Healthcare Act",
            Description = "Establish a single-payer national health service covering all citizens.",
            Category = "healthcare",
            Cost = 4,
            ConstitutionalScore = 80,
            PolicyChanges = new()
            {
                new BillPolicyChange { PolicyId = "healthcare", TargetValue = 95 },
                new BillPolicyChange { PolicyId = "govt_spending", TargetValue = 70 },
            },
        },
        new BillTemplate
        {
            Id = "bill_public_option",
            Name = "Public Option Healthcare",
            Description = "Create a government-run insurance plan that competes with private insurers.",
            Category = "healthcare",
            Cost = 3,
            ConstitutionalScore = 80,
            PolicyChanges = new()
            {
                new BillPolicyChange { PolicyId = "healthcare", TargetValue = 75 },
            },
        },
        new BillTemplate
        {
            Id = "bill_private_healthcare_ban",
            Name = "Private Healthcare Ban",
            Description = "Outlaw private healthcare providers to ensure equal access for all.",
            Category = "healthcare",
            Cost = 3,
            ConstitutionalScore = 35,
            PolicyChanges = new()
            {
                new BillPolicyChange { PolicyId = "healthcare", TargetValue = 100 },
            },
        },
        new BillTemplate
        {
            Id = "bill_mental_health",
            Name = "Mental Health Funding Act",
            Description = "Massively expand mental health services, counseling, and crisis intervention.",
            Category = "healthcare",
            Cost = 2,
            ConstitutionalScore = 90,
            PolicyChanges = new()
            {
                new BillPolicyChange { PolicyId = "healthcare", TargetValue = 75 },
            },
        },
        new BillTemplate
        {
            Id = "bill_drug_pricing",
            Name = "Drug Price Control Act",
            Description = "Cap pharmaceutical prices and allow government bulk purchasing.",
            Category = "healthcare",
            Cost = 2,
            ConstitutionalScore = 65,
            PolicyChanges = new()
            {
                new BillPolicyChange { PolicyId = "healthcare", TargetValue = 70 },
            },
        },
        new BillTemplate
        {
            Id = "bill_health_privatization",
            Name = "Healthcare Privatization",
            Description = "Transition public health services to private providers for efficiency.",
            Category = "healthcare",
            Cost = 2,
            ConstitutionalScore = 70,
            PolicyChanges = new()
            {
                new BillPolicyChange { PolicyId = "healthcare", TargetValue = 25 },
            },
        },
        new BillTemplate
        {
            Id = "bill_hospital_investment",
            Name = "Hospital Modernization Act",
            Description = "Invest $200 billion in new hospitals, equipment, and rural health clinics.",
            Category = "healthcare",
            Cost = 3,
            ConstitutionalScore = 90,
            PolicyChanges = new()
            {
                new BillPolicyChange { PolicyId = "healthcare", TargetValue = 80 },
                new BillPolicyChange { PolicyId = "govt_spending", TargetValue = 65 },
            },
        },
        new BillTemplate
        {
            Id = "bill_pandemic_prep",
            Name = "Pandemic Preparedness Act",
            Description = "Stockpile medical supplies, fund vaccine research, and create rapid response teams.",
            Category = "healthcare",
            Cost = 2,
            ConstitutionalScore = 90,
            PolicyChanges = new()
            {
                new BillPolicyChange { PolicyId = "healthcare", TargetValue = 65 },
            },
        },
        new BillTemplate
        {
            Id = "bill_longterm_care",
            Name = "Long-Term Care Act",
            Description = "Universal long-term care insurance for elderly and disabled citizens.",
            Category = "healthcare",
            Cost = 3,
            ConstitutionalScore = 85,
            PolicyChanges = new()
            {
                new BillPolicyChange { PolicyId = "healthcare", TargetValue = 80 },
                new BillPolicyChange { PolicyId = "pensions", TargetValue = 70 },
            },
        },
        new BillTemplate
        {
            Id = "bill_dental_coverage",
            Name = "Universal Dental Coverage",
            Description = "Add dental care to the national health service — free cleanings, fillings, and procedures.",
            Category = "healthcare",
            Cost = 2,
            ConstitutionalScore = 85,
            PolicyChanges = new()
            {
                new BillPolicyChange { PolicyId = "healthcare", TargetValue = 75 },
            },
        },
        new BillTemplate
        {
            Id = "bill_vision_coverage",
            Name = "Universal Vision Care",
            Description = "Cover eye exams, glasses, and contact lenses under public health insurance.",
            Category = "healthcare",
            Cost = 2,
            ConstitutionalScore = 85,
            PolicyChanges = new()
            {
                new BillPolicyChange { PolicyId = "healthcare", TargetValue = 72 },
            },
        },
        new BillTemplate
        {
            Id = "bill_drug_import",
            Name = "Prescription Drug Import Act",
            Description = "Allow importing cheaper medications from verified international pharmacies.",
            Category = "healthcare",
            Cost = 2,
            ConstitutionalScore = 70,
            PolicyChanges = new()
            {
                new BillPolicyChange { PolicyId = "healthcare", TargetValue = 65 },
                new BillPolicyChange { PolicyId = "trade_openness", TargetValue = 65 },
            },
        },
        new BillTemplate
        {
            Id = "bill_healthcare_worker_pay",
            Name = "Healthcare Worker Pay Act",
            Description = "Raise salaries for nurses, paramedics, and hospital staff by 25%.",
            Category = "healthcare",
            Cost = 2,
            ConstitutionalScore = 90,
            PolicyChanges = new()
            {
                new BillPolicyChange { PolicyId = "healthcare", TargetValue = 72 },
            },
        },
        new BillTemplate
        {
            Id = "bill_telemedicine",
            Name = "Telemedicine Expansion",
            Description = "Fund broadband infrastructure and platforms for remote medical consultations.",
            Category = "healthcare",
            Cost = 2,
            ConstitutionalScore = 92,
            PolicyChanges = new()
            {
                new BillPolicyChange { PolicyId = "healthcare", TargetValue = 65 },
                new BillPolicyChange { PolicyId = "tech_research", TargetValue = 60 },
            },
        },
        new BillTemplate
        {
            Id = "bill_rehab_funding",
            Name = "Addiction Rehabilitation Funding",
            Description = "Triple funding for drug and alcohol rehabilitation centers and outreach programs.",
            Category = "healthcare",
            Cost = 2,
            ConstitutionalScore = 88,
            PolicyChanges = new()
            {
                new BillPolicyChange { PolicyId = "healthcare", TargetValue = 68 },
                new BillPolicyChange { PolicyId = "drug_policy", TargetValue = 60 },
            },
        },
        new BillTemplate
        {
            Id = "bill_free_university",
            Name = "Free University Education",
            Description = "Abolish tuition fees at all public universities funded by tax revenue.",
            Category = "education",
            Cost = 3,
            ConstitutionalScore = 80,
            PolicyChanges = new()
            {
                new BillPolicyChange { PolicyId = "education", TargetValue = 90 },
                new BillPolicyChange { PolicyId = "govt_spending", TargetValue = 65 },
            },
        },
        new BillTemplate
        {
            Id = "bill_school_vouchers",
            Name = "School Voucher Program",
            Description = "Give parents vouchers to choose any school, including private institutions.",
            Category = "education",
            Cost = 2,
            ConstitutionalScore = 60,
            PolicyChanges = new()
            {
                new BillPolicyChange { PolicyId = "education", TargetValue = 45 },
            },
        },
        new BillTemplate
        {
            Id = "bill_stem_funding",
            Name = "STEM Education Investment",
            Description = "Triple funding for science, technology, engineering, and mathematics programs.",
            Category = "education",
            Cost = 3,
            ConstitutionalScore = 90,
            PolicyChanges = new()
            {
                new BillPolicyChange { PolicyId = "education", TargetValue = 75 },
                new BillPolicyChange { PolicyId = "tech_research", TargetValue = 70 },
            },
        },
        new BillTemplate
        {
            Id = "bill_teacher_pay",
            Name = "Teacher Pay Increase Act",
            Description = "Raise teacher salaries by 30% to attract top talent to education.",
            Category = "education",
            Cost = 2,
            ConstitutionalScore = 90,
            PolicyChanges = new()
            {
                new BillPolicyChange { PolicyId = "education", TargetValue = 70 },
            },
        },
        new BillTemplate
        {
            Id = "bill_vocational_training",
            Name = "Vocational Training Expansion",
            Description = "Fund apprenticeships and trade schools as alternatives to university.",
            Category = "education",
            Cost = 2,
            ConstitutionalScore = 92,
            PolicyChanges = new()
            {
                new BillPolicyChange { PolicyId = "education", TargetValue = 65 },
            },
        },
        new BillTemplate
        {
            Id = "bill_student_loan_forgiveness",
            Name = "Student Loan Forgiveness",
            Description = "Cancel up to $50,000 in student debt for qualifying borrowers.",
            Category = "education",
            Cost = 3,
            ConstitutionalScore = 60,
            PolicyChanges = new()
            {
                new BillPolicyChange { PolicyId = "education", TargetValue = 80 },
                new BillPolicyChange { PolicyId = "govt_spending", TargetValue = 65 },
            },
        },
        new BillTemplate
        {
            Id = "bill_charter_schools",
            Name = "Charter School Expansion",
            Description = "Allow more publicly funded, privately operated charter schools to open.",
            Category = "education",
            Cost = 2,
            ConstitutionalScore = 75,
            PolicyChanges = new()
            {
                new BillPolicyChange { PolicyId = "education", TargetValue = 55 },
            },
        },
        new BillTemplate
        {
            Id = "bill_testing_reform",
            Name = "Standardized Testing Reform",
            Description = "Replace high-stakes testing with portfolio-based assessment and teacher evaluations.",
            Category = "education",
            Cost = 1,
            ConstitutionalScore = 85,
            PolicyChanges = new()
            {
                new BillPolicyChange { PolicyId = "education", TargetValue = 65 },
            },
        },
        new BillTemplate
        {
            Id = "bill_school_lunch",
            Name = "Universal School Lunch Program",
            Description = "Provide free breakfast and lunch to all K-12 students regardless of income.",
            Category = "education",
            Cost = 2,
            ConstitutionalScore = 90,
            PolicyChanges = new()
            {
                new BillPolicyChange { PolicyId = "education", TargetValue = 65 },
            },
        },
        new BillTemplate
        {
            Id = "bill_class_size",
            Name = "Class Size Reduction Act",
            Description = "Cap class sizes at 20 students by hiring more teachers and building new schools.",
            Category = "education",
            Cost = 3,
            ConstitutionalScore = 88,
            PolicyChanges = new()
            {
                new BillPolicyChange { PolicyId = "education", TargetValue = 75 },
                new BillPolicyChange { PolicyId = "govt_spending", TargetValue = 60 },
            },
        },
        new BillTemplate
        {
            Id = "bill_arts_education",
            Name = "Arts & Music Education Funding",
            Description = "Restore arts and music programs to all public schools with dedicated funding.",
            Category = "education",
            Cost = 2,
            ConstitutionalScore = 90,
            PolicyChanges = new()
            {
                new BillPolicyChange { PolicyId = "education", TargetValue = 65 },
            },
        },
        new BillTemplate
        {
            Id = "bill_special_ed",
            Name = "Special Education Funding Act",
            Description = "Triple federal funding for special education services and teacher training.",
            Category = "education",
            Cost = 2,
            ConstitutionalScore = 92,
            PolicyChanges = new()
            {
                new BillPolicyChange { PolicyId = "education", TargetValue = 70 },
            },
        },
        new BillTemplate
        {
            Id = "bill_literacy",
            Name = "National Literacy Campaign",
            Description = "Fund adult literacy programs and reading initiatives for underserved communities.",
            Category = "education",
            Cost = 1,
            ConstitutionalScore = 95,
            PolicyChanges = new()
            {
                new BillPolicyChange { PolicyId = "education", TargetValue = 62 },
            },
        },
        new BillTemplate
        {
            Id = "bill_early_childhood",
            Name = "Universal Pre-K Education",
            Description = "Provide free pre-kindergarten for all 3-4 year olds nationwide.",
            Category = "education",
            Cost = 3,
            ConstitutionalScore = 85,
            PolicyChanges = new()
            {
                new BillPolicyChange { PolicyId = "education", TargetValue = 75 },
                new BillPolicyChange { PolicyId = "govt_spending", TargetValue = 60 },
            },
        },
        new BillTemplate
        {
            Id = "bill_coding_curriculum",
            Name = "Digital Literacy Mandate",
            Description = "Make coding and digital skills a core subject from primary school onwards.",
            Category = "education",
            Cost = 2,
            ConstitutionalScore = 88,
            PolicyChanges = new()
            {
                new BillPolicyChange { PolicyId = "education", TargetValue = 68 },
                new BillPolicyChange { PolicyId = "tech_research", TargetValue = 60 },
            },
        },
        new BillTemplate
        {
            Id = "bill_school_safety",
            Name = "School Safety Act",
            Description = "Fund security upgrades, counselors, and mental health support in all schools.",
            Category = "education",
            Cost = 2,
            ConstitutionalScore = 88,
            PolicyChanges = new()
            {
                new BillPolicyChange { PolicyId = "education", TargetValue = 65 },
                new BillPolicyChange { PolicyId = "police", TargetValue = 55 },
            },
        },
        new BillTemplate
        {
            Id = "bill_education_privatize",
            Name = "Education Privatization Act",
            Description = "Transfer public school management to private companies for efficiency.",
            Category = "education",
            Cost = 2,
            ConstitutionalScore = 55,
            PolicyChanges = new()
            {
                new BillPolicyChange { PolicyId = "education", TargetValue = 35 },
            },
        },
        new BillTemplate
        {
            Id = "bill_history_curriculum",
            Name = "National History Curriculum",
            Description = "Standardize history teaching to include diverse perspectives and critical thinking.",
            Category = "education",
            Cost = 1,
            ConstitutionalScore = 70,
            PolicyChanges = new()
            {
                new BillPolicyChange { PolicyId = "education", TargetValue = 63 },
            },
        },
        new BillTemplate
        {
            Id = "bill_research_grants",
            Name = "University Research Grants",
            Description = "Quadruple government research grants for academic institutions.",
            Category = "education",
            Cost = 3,
            ConstitutionalScore = 92,
            PolicyChanges = new()
            {
                new BillPolicyChange { PolicyId = "education", TargetValue = 72 },
                new BillPolicyChange { PolicyId = "tech_research", TargetValue = 72 },
            },
        },
        new BillTemplate
        {
            Id = "bill_carbon_tax",
            Name = "Carbon Tax Act",
            Description = "Tax carbon emissions at $50/ton, rebating proceeds equally to all citizens.",
            Category = "environment",
            Cost = 3,
            ConstitutionalScore = 75,
            PolicyChanges = new()
            {
                new BillPolicyChange { PolicyId = "carbon_tax", TargetValue = 80 },
                new BillPolicyChange { PolicyId = "env_regulations", TargetValue = 70 },
            },
        },
        new BillTemplate
        {
            Id = "bill_green_new_deal",
            Name = "Green New Deal",
            Description = "Massive investment in renewable energy, green jobs, and emissions reduction.",
            Category = "environment",
            Cost = 4,
            ConstitutionalScore = 70,
            PolicyChanges = new()
            {
                new BillPolicyChange { PolicyId = "renewables", TargetValue = 95 },
                new BillPolicyChange { PolicyId = "env_regulations", TargetValue = 85 },
                new BillPolicyChange { PolicyId = "govt_spending", TargetValue = 75 },
            },
        },
        new BillTemplate
        {
            Id = "bill_fracking_ban",
            Name = "Fracking Ban",
            Description = "Permanently ban hydraulic fracturing for oil and gas extraction.",
            Category = "environment",
            Cost = 2,
            ConstitutionalScore = 55,
            PolicyChanges = new()
            {
                new BillPolicyChange { PolicyId = "env_regulations", TargetValue = 80 },
            },
        },
        new BillTemplate
        {
            Id = "bill_wildlife_protection",
            Name = "Wildlife Protection Act",
            Description = "Expand protected areas by 30% and increase penalties for poaching.",
            Category = "environment",
            Cost = 2,
            ConstitutionalScore = 88,
            PolicyChanges = new()
            {
                new BillPolicyChange { PolicyId = "env_regulations", TargetValue = 70 },
                new BillPolicyChange { PolicyId = "agriculture", TargetValue = 40 },
            },
        },
        new BillTemplate
        {
            Id = "bill_nuclear_energy",
            Name = "Nuclear Energy Expansion",
            Description = "Build 10 new nuclear power plants for clean baseload electricity.",
            Category = "environment",
            Cost = 3,
            ConstitutionalScore = 70,
            PolicyChanges = new()
            {
                new BillPolicyChange { PolicyId = "renewables", TargetValue = 65 },
                new BillPolicyChange { PolicyId = "tech_research", TargetValue = 65 },
            },
        },
        new BillTemplate
        {
            Id = "bill_renewable_subsidies",
            Name = "Renewable Energy Subsidies",
            Description = "Massive tax credits and subsidies for solar, wind, and geothermal installation.",
            Category = "environment",
            Cost = 3,
            ConstitutionalScore = 85,
            PolicyChanges = new()
            {
                new BillPolicyChange { PolicyId = "renewables", TargetValue = 85 },
                new BillPolicyChange { PolicyId = "govt_spending", TargetValue = 60 },
            },
        },
        new BillTemplate
        {
            Id = "bill_ev_mandate",
            Name = "Electric Vehicle Mandate",
            Description = "Ban new fossil fuel car sales by 2035, with subsidies for EV purchases.",
            Category = "environment",
            Cost = 3,
            ConstitutionalScore = 60,
            PolicyChanges = new()
            {
                new BillPolicyChange { PolicyId = "env_regulations", TargetValue = 80 },
                new BillPolicyChange { PolicyId = "renewables", TargetValue = 70 },
            },
        },
        new BillTemplate
        {
            Id = "bill_plastic_ban",
            Name = "Single-Use Plastics Ban",
            Description = "Ban single-use plastic bags, straws, cutlery, and packaging nationwide.",
            Category = "environment",
            Cost = 1,
            ConstitutionalScore = 80,
            PolicyChanges = new()
            {
                new BillPolicyChange { PolicyId = "env_regulations", TargetValue = 65 },
            },
        },
        new BillTemplate
        {
            Id = "bill_reforestation",
            Name = "National Reforestation Act",
            Description = "Plant 1 billion trees over 10 years and restore degraded forests.",
            Category = "environment",
            Cost = 2,
            ConstitutionalScore = 92,
            PolicyChanges = new()
            {
                new BillPolicyChange { PolicyId = "env_regulations", TargetValue = 65 },
            },
        },
        new BillTemplate
        {
            Id = "bill_water_protection",
            Name = "Clean Water Protection Act",
            Description = "Strict regulations on industrial water pollution and pesticide runoff.",
            Category = "environment",
            Cost = 2,
            ConstitutionalScore = 88,
            PolicyChanges = new()
            {
                new BillPolicyChange { PolicyId = "env_regulations", TargetValue = 72 },
            },
        },
        new BillTemplate
        {
            Id = "bill_air_quality",
            Name = "Air Quality Standards Act",
            Description = "Tighten emissions standards for factories, power plants, and vehicles.",
            Category = "environment",
            Cost = 2,
            ConstitutionalScore = 82,
            PolicyChanges = new()
            {
                new BillPolicyChange { PolicyId = "env_regulations", TargetValue = 75 },
            },
        },
        new BillTemplate
        {
            Id = "bill_climate_adaptation",
            Name = "Climate Adaptation Fund",
            Description = "Invest in flood defenses, drought preparation, and climate-resilient infrastructure.",
            Category = "environment",
            Cost = 2,
            ConstitutionalScore = 90,
            PolicyChanges = new()
            {
                new BillPolicyChange { PolicyId = "env_regulations", TargetValue = 60 },
                new BillPolicyChange { PolicyId = "govt_spending", TargetValue = 60 },
            },
        },
        new BillTemplate
        {
            Id = "bill_carbon_capture",
            Name = "Carbon Capture Investment",
            Description = "Fund development of carbon capture and storage technology at industrial scale.",
            Category = "environment",
            Cost = 3,
            ConstitutionalScore = 85,
            PolicyChanges = new()
            {
                new BillPolicyChange { PolicyId = "tech_research", TargetValue = 70 },
                new BillPolicyChange { PolicyId = "env_regulations", TargetValue = 55 },
            },
        },
        new BillTemplate
        {
            Id = "bill_env_deregulation",
            Name = "Environmental Deregulation",
            Description = "Roll back environmental regulations to boost economic growth and job creation.",
            Category = "environment",
            Cost = 2,
            ConstitutionalScore = 70,
            PolicyChanges = new()
            {
                new BillPolicyChange { PolicyId = "env_regulations", TargetValue = 20 },
            },
        },
        new BillTemplate
        {
            Id = "bill_circular_economy",
            Name = "Circular Economy Act",
            Description = "Mandate recycling targets, product repair rights, and extended producer responsibility.",
            Category = "environment",
            Cost = 2,
            ConstitutionalScore = 82,
            PolicyChanges = new()
            {
                new BillPolicyChange { PolicyId = "env_regulations", TargetValue = 68 },
            },
        },
        new BillTemplate
        {
            Id = "bill_police_reform",
            Name = "Police Reform Act",
            Description = "Mandate body cameras, de-escalation training, and civilian oversight boards.",
            Category = "security",
            Cost = 2,
            ConstitutionalScore = 85,
            PolicyChanges = new()
            {
                new BillPolicyChange { PolicyId = "police", TargetValue = 55 },
                new BillPolicyChange { PolicyId = "civil_rights", TargetValue = 75 },
            },
        },
        new BillTemplate
        {
            Id = "bill_surveillance",
            Name = "National Surveillance Act",
            Description = "Expand electronic surveillance powers for intelligence agencies.",
            Category = "security",
            Cost = 2,
            ConstitutionalScore = 30,
            PolicyChanges = new()
            {
                new BillPolicyChange { PolicyId = "intelligence", TargetValue = 85 },
                new BillPolicyChange { PolicyId = "civil_rights", TargetValue = 30 },
            },
        },
        new BillTemplate
        {
            Id = "bill_gun_control",
            Name = "Comprehensive Gun Control",
            Description = "Ban assault weapons, require background checks and licensing for all firearms.",
            Category = "security",
            Cost = 2,
            ConstitutionalScore = 45,
            PolicyChanges = new()
            {
                new BillPolicyChange { PolicyId = "gun_control", TargetValue = 85 },
            },
        },
        new BillTemplate
        {
            Id = "bill_gun_moderate",
            Name = "Universal Background Checks",
            Description = "Require background checks for all gun sales including private transactions.",
            Category = "security",
            Cost = 1,
            ConstitutionalScore = 70,
            PolicyChanges = new()
            {
                new BillPolicyChange { PolicyId = "gun_control", TargetValue = 60 },
            },
        },
        new BillTemplate
        {
            Id = "bill_gun_rights",
            Name = "Gun Rights Expansion",
            Description = "Expand concealed carry permits, reduce waiting periods, and preempt local gun laws.",
            Category = "security",
            Cost = 2,
            ConstitutionalScore = 65,
            PolicyChanges = new()
            {
                new BillPolicyChange { PolicyId = "gun_control", TargetValue = 15 },
            },
        },
        new BillTemplate
        {
            Id = "bill_military_expansion",
            Name = "Military Modernization Act",
            Description = "Double the defense budget to modernize armed forces and expand capabilities.",
            Category = "security",
            Cost = 3,
            ConstitutionalScore = 85,
            PolicyChanges = new()
            {
                new BillPolicyChange { PolicyId = "military", TargetValue = 85 },
                new BillPolicyChange { PolicyId = "govt_spending", TargetValue = 70 },
            },
        },
        new BillTemplate
        {
            Id = "bill_military_cuts",
            Name = "Defense Spending Reduction",
            Description = "Cut military budget by 30% and redirect funds to social programs.",
            Category = "security",
            Cost = 2,
            ConstitutionalScore = 75,
            PolicyChanges = new()
            {
                new BillPolicyChange { PolicyId = "military", TargetValue = 30 },
            },
        },
        new BillTemplate
        {
            Id = "bill_cyber_defense",
            Name = "Cyber Defense Initiative",
            Description = "Create a national cyber defense force to protect critical infrastructure.",
            Category = "security",
            Cost = 2,
            ConstitutionalScore = 82,
            PolicyChanges = new()
            {
                new BillPolicyChange { PolicyId = "intelligence", TargetValue = 70 },
                new BillPolicyChange { PolicyId = "tech_research", TargetValue = 65 },
            },
        },
        new BillTemplate
        {
            Id = "bill_border_security_increase",
            Name = "Border Security Enhancement",
            Description = "Fund drones, sensors, and personnel to secure national borders.",
            Category = "security",
            Cost = 2,
            ConstitutionalScore = 80,
            PolicyChanges = new()
            {
                new BillPolicyChange { PolicyId = "border_security", TargetValue = 80 },
            },
        },
        new BillTemplate
        {
            Id = "bill_intelligence_funding",
            Name = "Intelligence Services Expansion",
            Description = "Increase funding for intelligence agencies by 50% with enhanced oversight.",
            Category = "security",
            Cost = 2,
            ConstitutionalScore = 70,
            PolicyChanges = new()
            {
                new BillPolicyChange { PolicyId = "intelligence", TargetValue = 75 },
            },
        },
        new BillTemplate
        {
            Id = "bill_veteran_benefits",
            Name = "Veterans Benefits Expansion",
            Description = "Expand healthcare, housing, and job training programs for military veterans.",
            Category = "security",
            Cost = 2,
            ConstitutionalScore = 92,
            PolicyChanges = new()
            {
                new BillPolicyChange { PolicyId = "military", TargetValue = 60 },
                new BillPolicyChange { PolicyId = "healthcare", TargetValue = 60 },
            },
        },
        new BillTemplate
        {
            Id = "bill_emergency_response",
            Name = "National Emergency Response Act",
            Description = "Create rapid-response teams and stockpile supplies for natural disasters.",
            Category = "security",
            Cost = 2,
            ConstitutionalScore = 90,
            PolicyChanges = new()
            {
                new BillPolicyChange { PolicyId = "police", TargetValue = 55 },
            },
        },
        new BillTemplate
        {
            Id = "bill_counter_terrorism",
            Name = "Counter-Terrorism Act",
            Description = "Expand anti-terrorism powers including preventive detention and asset freezing.",
            Category = "security",
            Cost = 2,
            ConstitutionalScore = 40,
            PolicyChanges = new()
            {
                new BillPolicyChange { PolicyId = "intelligence", TargetValue = 80 },
                new BillPolicyChange { PolicyId = "civil_rights", TargetValue = 40 },
            },
        },
        new BillTemplate
        {
            Id = "bill_police_funding",
            Name = "Police Funding Increase",
            Description = "Increase police budgets by 25% for more officers and better equipment.",
            Category = "security",
            Cost = 2,
            ConstitutionalScore = 85,
            PolicyChanges = new()
            {
                new BillPolicyChange { PolicyId = "police", TargetValue = 75 },
            },
        },
        new BillTemplate
        {
            Id = "bill_defund_police",
            Name = "Redirect Police Funding",
            Description = "Redirect 40% of police budgets to social workers, mental health, and community programs.",
            Category = "security",
            Cost = 2,
            ConstitutionalScore = 70,
            PolicyChanges = new()
            {
                new BillPolicyChange { PolicyId = "police", TargetValue = 30 },
                new BillPolicyChange { PolicyId = "civil_rights", TargetValue = 70 },
            },
        },
        new BillTemplate
        {
            Id = "bill_marriage_equality",
            Name = "Marriage Equality Act",
            Description = "Legalize same-sex marriage nationwide with full equal rights.",
            Category = "social",
            Cost = 1,
            ConstitutionalScore = 65,
            PolicyChanges = new()
            {
                new BillPolicyChange { PolicyId = "civil_rights", TargetValue = 80 },
            },
        },
        new BillTemplate
        {
            Id = "bill_drug_decriminalization",
            Name = "Drug Decriminalization",
            Description = "Decriminalize personal drug use, redirect funding to treatment programs.",
            Category = "social",
            Cost = 2,
            ConstitutionalScore = 55,
            PolicyChanges = new()
            {
                new BillPolicyChange { PolicyId = "drug_policy", TargetValue = 80 },
                new BillPolicyChange { PolicyId = "civil_rights", TargetValue = 70 },
            },
        },
        new BillTemplate
        {
            Id = "bill_abortion_rights",
            Name = "Reproductive Rights Act",
            Description = "Enshrine abortion access as a protected right in national law.",
            Category = "social",
            Cost = 2,
            ConstitutionalScore = 50,
            PolicyChanges = new()
            {
                new BillPolicyChange { PolicyId = "civil_rights", TargetValue = 80 },
            },
        },
        new BillTemplate
        {
            Id = "bill_press_protection",
            Name = "Press Freedom Protection",
            Description = "Shield journalists from prosecution and mandate government transparency.",
            Category = "social",
            Cost = 1,
            ConstitutionalScore = 92,
            PolicyChanges = new()
            {
                new BillPolicyChange { PolicyId = "press_freedom", TargetValue = 90 },
            },
        },
        new BillTemplate
        {
            Id = "bill_traditional_values",
            Name = "Traditional Values Act",
            Description = "Promote traditional family structures through tax breaks and education policy.",
            Category = "social",
            Cost = 2,
            ConstitutionalScore = 50,
            PolicyChanges = new()
            {
                new BillPolicyChange { PolicyId = "religious_freedom", TargetValue = 80 },
                new BillPolicyChange { PolicyId = "civil_rights", TargetValue = 35 },
            },
        },
        new BillTemplate
        {
            Id = "bill_religious_freedom",
            Name = "Religious Freedom Restoration",
            Description = "Protect the right to practice any religion and exempt religious institutions from certain regulations.",
            Category = "social",
            Cost = 1,
            ConstitutionalScore = 75,
            PolicyChanges = new()
            {
                new BillPolicyChange { PolicyId = "religious_freedom", TargetValue = 85 },
            },
        },
        new BillTemplate
        {
            Id = "bill_lgbtq_protections",
            Name = "LGBTQ+ Anti-Discrimination Act",
            Description = "Ban discrimination based on sexual orientation and gender identity in employment, housing, and services.",
            Category = "social",
            Cost = 2,
            ConstitutionalScore = 75,
            PolicyChanges = new()
            {
                new BillPolicyChange { PolicyId = "civil_rights", TargetValue = 82 },
            },
        },
        new BillTemplate
        {
            Id = "bill_hate_crime",
            Name = "Hate Crime Enhancement Act",
            Description = "Stiffer penalties for crimes motivated by race, religion, gender, or sexual orientation.",
            Category = "social",
            Cost = 1,
            ConstitutionalScore = 78,
            PolicyChanges = new()
            {
                new BillPolicyChange { PolicyId = "civil_rights", TargetValue = 72 },
                new BillPolicyChange { PolicyId = "police", TargetValue = 55 },
            },
        },
        new BillTemplate
        {
            Id = "bill_death_penalty_abolition",
            Name = "Death Penalty Abolition",
            Description = "Permanently abolish capital punishment and replace with life imprisonment.",
            Category = "social",
            Cost = 1,
            ConstitutionalScore = 70,
            PolicyChanges = new()
            {
                new BillPolicyChange { PolicyId = "civil_rights", TargetValue = 78 },
            },
        },
        new BillTemplate
        {
            Id = "bill_voting_rights",
            Name = "Voting Rights Expansion",
            Description = "Automatic voter registration, mail-in voting, and making election day a national holiday.",
            Category = "social",
            Cost = 2,
            ConstitutionalScore = 80,
            PolicyChanges = new()
            {
                new BillPolicyChange { PolicyId = "civil_rights", TargetValue = 80 },
            },
        },
        new BillTemplate
        {
            Id = "bill_prison_reform",
            Name = "Prison Reform Act",
            Description = "Reduce mandatory minimums, expand rehabilitation, and ban private prisons.",
            Category = "social",
            Cost = 2,
            ConstitutionalScore = 75,
            PolicyChanges = new()
            {
                new BillPolicyChange { PolicyId = "civil_rights", TargetValue = 75 },
                new BillPolicyChange { PolicyId = "police", TargetValue = 45 },
            },
        },
        new BillTemplate
        {
            Id = "bill_cannabis_legalization",
            Name = "Cannabis Legalization",
            Description = "Fully legalize recreational cannabis, tax sales, and expunge prior convictions.",
            Category = "social",
            Cost = 2,
            ConstitutionalScore = 65,
            PolicyChanges = new()
            {
                new BillPolicyChange { PolicyId = "drug_policy", TargetValue = 75 },
                new BillPolicyChange { PolicyId = "civil_rights", TargetValue = 68 },
            },
        },
        new BillTemplate
        {
            Id = "bill_censorship",
            Name = "Content Regulation Act",
            Description = "Government oversight of media and internet content to combat misinformation.",
            Category = "social",
            Cost = 2,
            ConstitutionalScore = 25,
            PolicyChanges = new()
            {
                new BillPolicyChange { PolicyId = "press_freedom", TargetValue = 30 },
                new BillPolicyChange { PolicyId = "civil_rights", TargetValue = 35 },
            },
        },
        new BillTemplate
        {
            Id = "bill_housing_right",
            Name = "Right to Housing Act",
            Description = "Enshrine housing as a fundamental right, expand public housing and rent controls.",
            Category = "social",
            Cost = 3,
            ConstitutionalScore = 65,
            PolicyChanges = new()
            {
                new BillPolicyChange { PolicyId = "housing_subsidies", TargetValue = 85 },
                new BillPolicyChange { PolicyId = "govt_spending", TargetValue = 65 },
            },
        },
        new BillTemplate
        {
            Id = "bill_whistleblower",
            Name = "Whistleblower Protection Act",
            Description = "Strong legal protections and rewards for whistleblowers exposing government or corporate wrongdoing.",
            Category = "social",
            Cost = 1,
            ConstitutionalScore = 85,
            PolicyChanges = new()
            {
                new BillPolicyChange { PolicyId = "press_freedom", TargetValue = 75 },
                new BillPolicyChange { PolicyId = "civil_rights", TargetValue = 70 },
            },
        },
        new BillTemplate
        {
            Id = "bill_border_wall",
            Name = "Border Wall Construction",
            Description = "Build a fortified border wall and increase border patrol staffing.",
            Category = "immigration",
            Cost = 3,
            ConstitutionalScore = 70,
            PolicyChanges = new()
            {
                new BillPolicyChange { PolicyId = "border_security", TargetValue = 90 },
                new BillPolicyChange { PolicyId = "immigration", TargetValue = 15 },
            },
        },
        new BillTemplate
        {
            Id = "bill_path_citizenship",
            Name = "Path to Citizenship",
            Description = "Create a legal pathway to citizenship for undocumented residents.",
            Category = "immigration",
            Cost = 2,
            ConstitutionalScore = 60,
            PolicyChanges = new()
            {
                new BillPolicyChange { PolicyId = "immigration", TargetValue = 80 },
                new BillPolicyChange { PolicyId = "civil_rights", TargetValue = 70 },
            },
        },
        new BillTemplate
        {
            Id = "bill_refugee_program",
            Name = "Refugee Resettlement Program",
            Description = "Expand refugee intake by 200% and provide integration support services.",
            Category = "immigration",
            Cost = 2,
            ConstitutionalScore = 75,
            PolicyChanges = new()
            {
                new BillPolicyChange { PolicyId = "immigration", TargetValue = 85 },
                new BillPolicyChange { PolicyId = "foreign_aid", TargetValue = 65 },
            },
        },
        new BillTemplate
        {
            Id = "bill_work_visa",
            Name = "Work Visa Reform",
            Description = "Streamline work visa process, increase quotas, and create fast-track for critical industries.",
            Category = "immigration",
            Cost = 2,
            ConstitutionalScore = 80,
            PolicyChanges = new()
            {
                new BillPolicyChange { PolicyId = "immigration", TargetValue = 70 },
            },
        },
        new BillTemplate
        {
            Id = "bill_deportation",
            Name = "Strict Deportation Policy",
            Description = "Expedite deportation of undocumented immigrants and visa overstayers.",
            Category = "immigration",
            Cost = 2,
            ConstitutionalScore = 55,
            PolicyChanges = new()
            {
                new BillPolicyChange { PolicyId = "immigration", TargetValue = 20 },
                new BillPolicyChange { PolicyId = "border_security", TargetValue = 80 },
            },
        },
        new BillTemplate
        {
            Id = "bill_sanctuary",
            Name = "Sanctuary Cities Protection",
            Description = "Protect cities that refuse to enforce federal immigration detainers.",
            Category = "immigration",
            Cost = 2,
            ConstitutionalScore = 50,
            PolicyChanges = new()
            {
                new BillPolicyChange { PolicyId = "immigration", TargetValue = 75 },
                new BillPolicyChange { PolicyId = "civil_rights", TargetValue = 72 },
            },
        },
        new BillTemplate
        {
            Id = "bill_immigration_courts",
            Name = "Immigration Court Reform",
            Description = "Hire more immigration judges to clear backlogs and ensure fair hearings.",
            Category = "immigration",
            Cost = 2,
            ConstitutionalScore = 88,
            PolicyChanges = new()
            {
                new BillPolicyChange { PolicyId = "immigration", TargetValue = 55 },
            },
        },
        new BillTemplate
        {
            Id = "bill_family_reunification",
            Name = "Family Reunification Act",
            Description = "Prioritize family-based immigration and speed up visa processing for relatives.",
            Category = "immigration",
            Cost = 2,
            ConstitutionalScore = 78,
            PolicyChanges = new()
            {
                new BillPolicyChange { PolicyId = "immigration", TargetValue = 72 },
            },
        },
        new BillTemplate
        {
            Id = "bill_skilled_worker",
            Name = "Skilled Worker Visa Expansion",
            Description = "Double H-1B equivalent visas for tech workers, engineers, and scientists.",
            Category = "immigration",
            Cost = 2,
            ConstitutionalScore = 82,
            PolicyChanges = new()
            {
                new BillPolicyChange { PolicyId = "immigration", TargetValue = 65 },
                new BillPolicyChange { PolicyId = "tech_research", TargetValue = 60 },
            },
        },
        new BillTemplate
        {
            Id = "bill_immigration_ban",
            Name = "Immigration Moratorium",
            Description = "Temporary halt to all immigration for 2 years to assess national capacity.",
            Category = "immigration",
            Cost = 3,
            ConstitutionalScore = 35,
            PolicyChanges = new()
            {
                new BillPolicyChange { PolicyId = "immigration", TargetValue = 5 },
                new BillPolicyChange { PolicyId = "border_security", TargetValue = 85 },
            },
        },
    };
}
