/**
 * Law Firm Tier Classification for Precedent Quality Scoring
 * Tier 1 (1.0): Elite M&A boutiques and top-tier full-service firms
 * Tier 2 (0.85): Major national firms with strong M&A practices
 * Tier 3 (0.70): Other Am Law 50 firms
 * Tier 4 (0.50): Regional/smaller firms
 * Unknown (0.40): Cannot identify firm
 */

export const FIRM_TIERS: Record<string, number> = {
  // Tier 1 (1.0)
  'Wachtell': 1.0,
  'Wachtell, Lipton, Rosen & Katz': 1.0,
  'Sullivan & Cromwell': 1.0,
  'Cravath': 1.0,
  'Cravath, Swaine & Moore': 1.0,
  'Simpson Thacher': 1.0,
  'Simpson Thacher & Bartlett': 1.0,
  'Skadden': 1.0,
  'Skadden, Arps, Slate, Meagher & Flom': 1.0,

  // Tier 2 (0.85)
  'Latham': 0.85,
  'Latham & Watkins': 0.85,
  'Kirkland': 0.85,
  'Kirkland & Ellis': 0.85,
  'Davis Polk': 0.85,
  'Davis Polk & Wardwell': 0.85,
  'Cleary': 0.85,
  'Cleary Gottlieb': 0.85,
  'Cleary Gottlieb Steen & Hamilton': 0.85,
  'Debevoise': 0.85,
  'Debevoise & Plimpton': 0.85,
  'Paul Weiss': 0.85,
  'Paul, Weiss, Rifkind, Wharton & Garrison': 0.85,
  'Weil': 0.85,
  'Weil, Gotshal & Manges': 0.85,
  'Gibson Dunn': 0.85,
  'Gibson, Dunn & Crutcher': 0.85,
  'Freshfields': 0.85,
  'Freshfields Bruckhaus Deringer': 0.85,

  // Tier 3 (0.70)
  'White & Case': 0.70,
  'Ropes & Gray': 0.70,
  'Sidley': 0.70,
  'Sidley Austin': 0.70,
  'Morgan Lewis': 0.70,
  'Morgan, Lewis & Bockius': 0.70,
  'Jones Day': 0.70,
  'Willkie': 0.70,
  'Willkie Farr & Gallagher': 0.70,
  'Fried Frank': 0.70,
  'Fried, Frank, Harris, Shriver & Jacobson': 0.70,
  'Goodwin': 0.70,
  'Goodwin Procter': 0.70,
  'Morrison & Foerster': 0.70,
  'DLA Piper': 0.70,
  'Baker McKenzie': 0.70,
  'Proskauer': 0.70,
  'Proskauer Rose': 0.70,
  'Milbank': 0.70,
  'Milbank LLP': 0.70,
  'Covington': 0.70,
  'Covington & Burling': 0.70,
  'Hogan Lovells': 0.70,
  'King & Spalding': 0.70,
  'Winston & Strawn': 0.70,
  'Mayer Brown': 0.70,
  'Orrick': 0.70,
  'Orrick, Herrington & Sutcliffe': 0.70,
  'Shearman': 0.70,
  'Shearman & Sterling': 0.70,
  'Allen & Overy': 0.70,
  'A&O Shearman': 0.70,
  'Linklaters': 0.70,
  'Clifford Chance': 0.70,
};

export const FIRM_TIER_UNKNOWN = 0.40;
export const FIRM_TIER_REGIONAL = 0.50;

/**
 * Look up the tier score for a firm name.
 * Uses fuzzy matching: tries exact match, then prefix match, then substring.
 */
export function lookupFirmTier(firmName: string): number {
  if (!firmName) return FIRM_TIER_UNKNOWN;

  const normalized = firmName.trim();

  // Exact match
  if (FIRM_TIERS[normalized] !== undefined) return FIRM_TIERS[normalized];

  // Case-insensitive match
  const lower = normalized.toLowerCase();
  for (const [name, tier] of Object.entries(FIRM_TIERS)) {
    if (name.toLowerCase() === lower) return tier;
  }

  // Substring match (firm name appears in the input)
  for (const [name, tier] of Object.entries(FIRM_TIERS)) {
    if (lower.includes(name.toLowerCase()) || name.toLowerCase().includes(lower)) {
      return tier;
    }
  }

  return FIRM_TIER_UNKNOWN;
}
