import { callClaude } from '../client';
import { buildTermSheetParserPrompt } from '../prompts/term-sheet-parser';
import type { DealParameters, DealParameterExtraction } from '@ma-deal-os/core';

export interface TermSheetParseResult {
  parameters: DealParameters;
  extractions: Record<string, DealParameterExtraction>;
  metadata: {
    deal_value?: DealParameterExtraction;
    target_name?: DealParameterExtraction;
    buyer_name?: DealParameterExtraction;
    seller_name?: DealParameterExtraction;
    industry?: DealParameterExtraction;
    buyer_type?: DealParameterExtraction;
  };
}

export async function parseTermSheet(termSheetText: string): Promise<TermSheetParseResult> {
  const messages = buildTermSheetParserPrompt(termSheetText);
  const response = await callClaude(messages, {
    model: 'claude-sonnet-4-5-20250929',
    maxTokens: 4096,
  });

  const jsonMatch = response.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Failed to parse term sheet: no JSON in response');
  }

  const parsed = JSON.parse(jsonMatch[0]);
  const extractions = parsed.parameters || {};
  const metadata = parsed.metadata || {};

  const parameters: DealParameters = {};

  if (extractions.transaction_structure?.value) {
    parameters.transaction_structure = extractions.transaction_structure.value;
  }
  if (extractions['entity_types.seller']?.value || extractions['entity_types.target']?.value || extractions['entity_types.buyer']?.value) {
    parameters.entity_types = {
      seller: extractions['entity_types.seller']?.value,
      target: extractions['entity_types.target']?.value,
      buyer: extractions['entity_types.buyer']?.value,
    };
  }
  if (extractions.buyer_formation?.value) {
    parameters.buyer_formation = extractions.buyer_formation.value;
  }
  if (extractions.consideration?.value) {
    parameters.consideration = Array.isArray(extractions.consideration.value)
      ? extractions.consideration.value
      : [extractions.consideration.value];
  }
  if (extractions.price_adjustments?.value) {
    parameters.price_adjustments = Array.isArray(extractions.price_adjustments.value)
      ? extractions.price_adjustments.value
      : [extractions.price_adjustments.value];
  }
  if (extractions.indemnification?.value) {
    parameters.indemnification = extractions.indemnification.value;
  }
  if (extractions.escrow?.value !== undefined) {
    parameters.escrow = extractions.escrow.value;
  }
  if (extractions.holdback?.value !== undefined) {
    parameters.holdback = extractions.holdback.value;
  }
  if (extractions.regulatory?.value) {
    parameters.regulatory = Array.isArray(extractions.regulatory.value)
      ? extractions.regulatory.value
      : [extractions.regulatory.value];
  }
  if (extractions['financing.type']?.value) {
    parameters.financing = {
      type: extractions['financing.type'].value,
      financing_condition: extractions['financing.financing_condition']?.value,
    };
  }
  if (extractions['key_employees.treatment']?.value) {
    parameters.key_employees = {
      treatment: extractions['key_employees.treatment'].value,
      non_competes: extractions['key_employees.non_competes']?.value,
    };
  }
  if (extractions['tsa.required']?.value !== undefined) {
    parameters.tsa = {
      required: extractions['tsa.required'].value,
      direction: extractions['tsa.direction']?.value,
    };
  }
  if (extractions.is_carveout?.value !== undefined) {
    parameters.is_carveout = extractions.is_carveout.value;
  }
  if (extractions.jurisdiction?.value) {
    parameters.jurisdiction = extractions.jurisdiction.value;
  }

  return { parameters, extractions, metadata };
}
