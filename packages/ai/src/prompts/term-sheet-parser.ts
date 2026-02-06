import type Anthropic from '@anthropic-ai/sdk';

export function buildTermSheetParserPrompt(termSheetText: string): Anthropic.MessageParam[] {
  return [
    {
      role: 'user',
      content: `You are an expert M&A attorney. Extract the following deal parameters from this term sheet.

For each parameter, provide:
- value: the extracted value (must be one of the allowed enum values)
- confidence: 0.0 to 1.0
- source_text: the exact quote from the term sheet that supports this extraction

## Parameters to Extract

1. transaction_structure: STOCK_PURCHASE | ASSET_PURCHASE | FORWARD_MERGER | REVERSE_MERGER | REVERSE_TRIANGULAR_MERGER
2. entity_types.seller: CORPORATION | LLC | LP | C_CORP | S_CORP | PE_FUND | INDIVIDUAL | CONSORTIUM
3. entity_types.target: (same options)
4. entity_types.buyer: (same options)
5. buyer_formation: EXISTING | NEWCO
6. consideration: (multi-select) CASH | BUYER_STOCK | SELLER_NOTE | ASSUMED_DEBT | ROLLOVER_EQUITY
7. price_adjustments: (multi-select) WORKING_CAPITAL_ADJ | NET_DEBT_ADJ | NET_CASH_ADJ | EARNOUT | MILESTONE_PAYMENTS
8. indemnification: TRADITIONAL | RW_INSURANCE_PRIMARY | RW_INSURANCE_SUPPLEMENTAL | ESCROW_ONLY | COMBO_ESCROW_AND_RWI
9. escrow: true | false
10. holdback: true | false
11. regulatory: (multi-select) HSR_FILING | CFIUS | INDUSTRY_SPECIFIC | FOREIGN_COMPETITION | STATE_REGULATORY
12. financing.type: CASH_ON_HAND | DEBT_FINANCED | EQUITY_COMMITMENT | COMBO
13. financing.financing_condition: true | false
14. key_employees.treatment: EMPLOYMENT_AGREEMENTS | CONSULTING | RETENTION_BONUSES | NONE | COMBO
15. key_employees.non_competes: true | false
16. tsa.required: true | false
17. tsa.direction: SELLER_TO_BUYER | BUYER_TO_SELLER | BILATERAL
18. is_carveout: true | false
19. jurisdiction: DELAWARE | NEW_YORK | CALIFORNIA | OTHER_US_STATE | FOREIGN

Also extract:
- deal_value (numeric, in dollars)
- target_name, buyer_name, seller_name
- industry
- buyer_type: PE | STRATEGIC | CONSORTIUM

Respond ONLY with a JSON object matching this structure:
{
  "parameters": {
    "transaction_structure": { "value": "...", "confidence": 0.95, "source_text": "..." },
    ...
  },
  "metadata": {
    "deal_value": { "value": 0, "confidence": 0.9, "source_text": "..." },
    "target_name": { "value": "...", "confidence": 0.9, "source_text": "..." },
    "buyer_name": { "value": "...", "confidence": 0.9, "source_text": "..." },
    "seller_name": { "value": "...", "confidence": 0.9, "source_text": "..." },
    "industry": { "value": "...", "confidence": 0.9, "source_text": "..." },
    "buyer_type": { "value": "...", "confidence": 0.9, "source_text": "..." }
  }
}

## Term Sheet:

${termSheetText}`,
    },
  ];
}
