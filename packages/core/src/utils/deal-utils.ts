import type { DealParameters } from '../types/deal';

export function getPrimaryAgreementType(params: DealParameters): string {
  switch (params.transaction_structure) {
    case 'STOCK_PURCHASE': return 'SPA';
    case 'ASSET_PURCHASE': return 'APA';
    case 'FORWARD_MERGER':
    case 'REVERSE_MERGER':
    case 'REVERSE_TRIANGULAR_MERGER': return 'MERGER_AGREEMENT';
    default: return 'SPA';
  }
}

export function getDealDisplayName(name: string, codeName?: string | null): string {
  return codeName ? `${name} (${codeName})` : name;
}
