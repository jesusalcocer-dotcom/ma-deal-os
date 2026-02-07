/**
 * Variant Strategy Definitions — 3 strategies per task type for competitive self-play.
 */

export interface VariantStrategy {
  name: string;
  instruction: string;
}

export const VARIANT_STRATEGIES: Record<string, VariantStrategy[]> = {
  disclosure_generation: [
    { name: 'conservative', instruction: 'Disclose broadly. Include all potentially relevant items. Err on side of over-disclosure. Add more schedules rather than fewer.' },
    { name: 'standard', instruction: 'Match typical disclosure practice for this deal type and jurisdiction. Follow market norms.' },
    { name: 'aggressive', instruction: 'Disclose only what is legally required. Minimize schedule count. Narrow materiality qualifiers.' },
  ],
  negotiation_analysis: [
    { name: 'firm', instruction: 'Recommend holding strong positions. Identify leverage points. Push for favorable terms.' },
    { name: 'balanced', instruction: 'Recommend fair compromise positions. Identify mutual wins. Standard market approach.' },
    { name: 'conciliatory', instruction: 'Recommend strategic concessions to advance deal speed. Identify low-cost gives.' },
  ],
  document_generation: [
    { name: 'buyer_protective', instruction: 'Draft with maximum buyer protections. Broad reps, low baskets, no caps on fundamental reps.' },
    { name: 'market', instruction: 'Draft to market standard. Typical baskets, caps, and limitations.' },
    { name: 'deal_speed', instruction: 'Draft for speed to close. Simplify where possible. Minimize provisions that will trigger negotiation.' },
  ],
};
