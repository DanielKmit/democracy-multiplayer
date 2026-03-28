import { Politician, MinistryId } from './types';

const POLITICIAN_POOL: Politician[] = [
  { id: 'pol_1', name: 'Elena Voss', competence: 9, loyalty: 6, economicLean: 45, socialLean: 70, specialty: 'finance', avatarColor: '#3B82F6', initials: 'EV' },
  { id: 'pol_2', name: 'Marcus Stein', competence: 7, loyalty: 8, economicLean: 60, socialLean: 40, specialty: 'defense', avatarColor: '#EF4444', initials: 'MS' },
  { id: 'pol_3', name: 'Anja Krüger', competence: 8, loyalty: 7, economicLean: 35, socialLean: 75, specialty: 'education', avatarColor: '#22C55E', initials: 'AK' },
  { id: 'pol_4', name: 'Friedrich Holt', competence: 6, loyalty: 9, economicLean: 55, socialLean: 35, specialty: 'interior', avatarColor: '#F97316', initials: 'FH' },
  { id: 'pol_5', name: 'Lena Berger', competence: 8, loyalty: 5, economicLean: 30, socialLean: 80, specialty: 'environment', avatarColor: '#06B6D4', initials: 'LB' },
  { id: 'pol_6', name: 'Otto Richter', competence: 7, loyalty: 7, economicLean: 70, socialLean: 50, specialty: 'finance', avatarColor: '#A855F7', initials: 'OR' },
  { id: 'pol_7', name: 'Clara Neumann', competence: 9, loyalty: 4, economicLean: 40, socialLean: 85, specialty: 'justice', avatarColor: '#EC4899', initials: 'CN' },
  { id: 'pol_8', name: 'Hans Weber', competence: 5, loyalty: 10, economicLean: 50, socialLean: 45, specialty: 'defense', avatarColor: '#EAB308', initials: 'HW' },
  { id: 'pol_9', name: 'Sophia Dahl', competence: 8, loyalty: 6, economicLean: 25, socialLean: 65, specialty: 'health', avatarColor: '#14B8A6', initials: 'SD' },
  { id: 'pol_10', name: 'Viktor Braun', competence: 6, loyalty: 8, economicLean: 75, socialLean: 30, specialty: 'interior', avatarColor: '#6366F1', initials: 'VB' },
  { id: 'pol_11', name: 'Ingrid Fuchs', competence: 7, loyalty: 7, economicLean: 45, socialLean: 60, specialty: 'foreign', avatarColor: '#F43F5E', initials: 'IF' },
  { id: 'pol_12', name: 'Karl Engel', competence: 9, loyalty: 3, economicLean: 20, socialLean: 90, specialty: 'justice', avatarColor: '#84CC16', initials: 'KE' },
  { id: 'pol_13', name: 'Marta Scholz', competence: 6, loyalty: 9, economicLean: 65, socialLean: 40, specialty: 'finance', avatarColor: '#D946EF', initials: 'MS' },
  { id: 'pol_14', name: 'Peter Winkler', competence: 8, loyalty: 5, economicLean: 50, socialLean: 55, specialty: 'education', avatarColor: '#0EA5E9', initials: 'PW' },
  { id: 'pol_15', name: 'Greta Hoffman', competence: 10, loyalty: 3, economicLean: 15, socialLean: 85, specialty: 'environment', avatarColor: '#10B981', initials: 'GH' },
  { id: 'pol_16', name: 'Dieter Lang', competence: 5, loyalty: 10, economicLean: 55, socialLean: 35, specialty: 'defense', avatarColor: '#F59E0B', initials: 'DL' },
  { id: 'pol_17', name: 'Anna Ritter', competence: 7, loyalty: 6, economicLean: 40, socialLean: 70, specialty: 'health', avatarColor: '#8B5CF6', initials: 'AR' },
  { id: 'pol_18', name: 'Lukas Bauer', competence: 8, loyalty: 7, economicLean: 60, socialLean: 50, specialty: 'foreign', avatarColor: '#FB923C', initials: 'LB' },
  { id: 'pol_19', name: 'Eva Schreiber', competence: 6, loyalty: 8, economicLean: 35, socialLean: 55, specialty: 'interior', avatarColor: '#2DD4BF', initials: 'ES' },
  { id: 'pol_20', name: 'Wolfgang Meier', competence: 7, loyalty: 9, economicLean: 70, socialLean: 25, specialty: 'justice', avatarColor: '#E11D48', initials: 'WM' },
];

export function getInitialPoliticianPool(): Politician[] {
  return POLITICIAN_POOL.map(p => ({ ...p }));
}

export function getPoliticianById(pool: Politician[], id: string): Politician | undefined {
  return pool.find(p => p.id === id);
}

export function getEffectiveCompetence(politician: Politician, ministry: MinistryId): number {
  const base = politician.competence;
  return politician.specialty === ministry ? Math.min(10, base + 3) : base;
}

// Check if a politician would resign based on policy direction
export function wouldResign(politician: Politician, policies: Record<string, number>): boolean {
  // Politicians with low loyalty are more likely to resign
  if (politician.loyalty >= 7) return false;
  
  // Check ideological alignment
  const econPolicies = ['income_tax', 'corporate_tax', 'minimum_wage', 'govt_spending'];
  const socialPolicies = ['civil_rights', 'press_freedom', 'immigration', 'drug_policy'];
  
  let econScore = 0;
  let econCount = 0;
  for (const p of econPolicies) {
    if (policies[p] !== undefined) {
      econScore += policies[p];
      econCount++;
    }
  }
  const avgEcon = econCount > 0 ? econScore / econCount : 50;
  
  let socialScore = 0;
  let socialCount = 0;
  for (const p of socialPolicies) {
    if (policies[p] !== undefined) {
      socialScore += policies[p];
      socialCount++;
    }
  }
  const avgSocial = socialCount > 0 ? socialScore / socialCount : 50;
  
  const econDiff = Math.abs(avgEcon - politician.economicLean);
  const socialDiff = Math.abs(avgSocial - politician.socialLean);
  
  // High disagreement + low loyalty = resignation risk
  const resignThreshold = politician.loyalty * 8;
  return (econDiff + socialDiff) > resignThreshold;
}
