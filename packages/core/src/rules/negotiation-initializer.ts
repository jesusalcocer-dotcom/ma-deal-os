/**
 * Negotiation Position Initializer
 * Seeds initial negotiation positions based on deal parameters and provision types.
 */

export interface InitialPosition {
  provision_type: string;
  provision_label: string;
  our_opening_position: string;
  our_current_position: string;
  category: string;
  significance: number;
  financial_impact: boolean;
}

interface DealParams {
  transaction_structure?: string;
  indemnification?: string;
  escrow?: boolean;
  deal_value?: string | number;
  buyer_type?: string;
  entity_types?: { seller?: string; buyer?: string; target?: string };
  financing?: { type?: string };
}

export function generateInitialPositions(params: DealParams): InitialPosition[] {
  const dealValue = Number(params.deal_value || 0);
  const isSPA = (params.transaction_structure || '').includes('STOCK');
  const hasEscrow = params.escrow === true;

  const positions: InitialPosition[] = [
    // Indemnification
    {
      provision_type: 'indemnification.basket.type',
      provision_label: 'Indemnification Basket Type',
      our_opening_position: 'True deductible basket',
      our_current_position: 'True deductible basket',
      category: 'indemnification',
      significance: 5,
      financial_impact: true,
    },
    {
      provision_type: 'indemnification.basket.amount',
      provision_label: 'Indemnification Basket Amount',
      our_opening_position: dealValue > 0 ? `$${Math.round(dealValue * 0.0075).toLocaleString()} (0.75% of deal value)` : '0.75% of deal value',
      our_current_position: dealValue > 0 ? `$${Math.round(dealValue * 0.0075).toLocaleString()} (0.75% of deal value)` : '0.75% of deal value',
      category: 'indemnification',
      significance: 5,
      financial_impact: true,
    },
    {
      provision_type: 'indemnification.cap.general',
      provision_label: 'General Indemnification Cap',
      our_opening_position: dealValue > 0 ? `$${Math.round(dealValue * 0.10).toLocaleString()} (10% of deal value)` : '10% of deal value',
      our_current_position: dealValue > 0 ? `$${Math.round(dealValue * 0.10).toLocaleString()} (10% of deal value)` : '10% of deal value',
      category: 'indemnification',
      significance: 5,
      financial_impact: true,
    },
    {
      provision_type: 'indemnification.cap.fundamental',
      provision_label: 'Fundamental Rep Cap',
      our_opening_position: 'Uncapped (full deal value)',
      our_current_position: 'Uncapped (full deal value)',
      category: 'indemnification',
      significance: 4,
      financial_impact: true,
    },
    // Survival
    {
      provision_type: 'survival.general',
      provision_label: 'General Rep Survival Period',
      our_opening_position: '18 months from closing',
      our_current_position: '18 months from closing',
      category: 'survival',
      significance: 4,
      financial_impact: true,
    },
    {
      provision_type: 'survival.fundamental',
      provision_label: 'Fundamental Rep Survival Period',
      our_opening_position: 'Statute of limitations (6 years)',
      our_current_position: 'Statute of limitations (6 years)',
      category: 'survival',
      significance: 4,
      financial_impact: true,
    },
    // Representations
    {
      provision_type: 'reps.knowledge_qualifier',
      provision_label: 'Knowledge Qualifier Standard',
      our_opening_position: 'Actual knowledge after reasonable inquiry',
      our_current_position: 'Actual knowledge after reasonable inquiry',
      category: 'representations',
      significance: 3,
      financial_impact: false,
    },
    {
      provision_type: 'reps.materiality_scrape',
      provision_label: 'Materiality Scrape',
      our_opening_position: 'Double materiality scrape (for both breach determination and loss calculation)',
      our_current_position: 'Double materiality scrape (for both breach determination and loss calculation)',
      category: 'representations',
      significance: 4,
      financial_impact: true,
    },
    // Covenants
    {
      provision_type: 'covenants.non_compete.duration',
      provision_label: 'Non-Compete Duration',
      our_opening_position: '3 years from closing',
      our_current_position: '3 years from closing',
      category: 'covenants',
      significance: 3,
      financial_impact: false,
    },
    {
      provision_type: 'covenants.non_compete.scope',
      provision_label: 'Non-Compete Geographic Scope',
      our_opening_position: 'Worldwide',
      our_current_position: 'Worldwide',
      category: 'covenants',
      significance: 3,
      financial_impact: false,
    },
    // Closing conditions
    {
      provision_type: 'closing.mac_definition',
      provision_label: 'Material Adverse Change Definition',
      our_opening_position: 'Broad MAC definition with standard carve-outs',
      our_current_position: 'Broad MAC definition with standard carve-outs',
      category: 'closing',
      significance: 5,
      financial_impact: true,
    },
    {
      provision_type: 'closing.bring_down_standard',
      provision_label: 'Bring-Down Standard',
      our_opening_position: 'Reps true and correct in all material respects at closing',
      our_current_position: 'Reps true and correct in all material respects at closing',
      category: 'closing',
      significance: 3,
      financial_impact: false,
    },
  ];

  // Add escrow-specific positions if applicable
  if (hasEscrow) {
    positions.push(
      {
        provision_type: 'escrow.amount',
        provision_label: 'Escrow Amount',
        our_opening_position: dealValue > 0 ? `$${Math.round(dealValue * 0.10).toLocaleString()} (10% of deal value)` : '10% of deal value',
        our_current_position: dealValue > 0 ? `$${Math.round(dealValue * 0.10).toLocaleString()} (10% of deal value)` : '10% of deal value',
        category: 'escrow',
        significance: 4,
        financial_impact: true,
      },
      {
        provision_type: 'escrow.release_schedule',
        provision_label: 'Escrow Release Schedule',
        our_opening_position: '50% at 12 months, 50% at 18 months post-closing',
        our_current_position: '50% at 12 months, 50% at 18 months post-closing',
        category: 'escrow',
        significance: 3,
        financial_impact: true,
      }
    );
  }

  return positions;
}
