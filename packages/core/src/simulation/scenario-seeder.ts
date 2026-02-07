/**
 * Scenario Seeder
 * Seeds a simulation scenario with deals, parameters, and initial data.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { SimulationConfig } from '../types/simulation';

export interface ScenarioContext {
  simulationId: string;
  buyerDealId: string;
  sellerDealId: string;
  termSheet: string;
  buyerInstructions: string;
  sellerInstructions: string;
  seededIssues: Array<{
    id: string;
    category: string;
    severity: string;
    description: string;
  }>;
}

/**
 * Seed a simulation scenario with buyer and seller deals.
 */
export async function seedScenario(
  supabase: SupabaseClient,
  config: SimulationConfig,
  seedData: {
    termSheet: string;
    buyerInstructions: string;
    sellerInstructions: string;
    vdrManifest: any;
  }
): Promise<ScenarioContext> {
  const simulationId = config.id || crypto.randomUUID();

  // Create buyer-side deal
  const { data: buyerDeal, error: buyerError } = await supabase
    .from('deals')
    .insert({
      name: `[SIM] DataFlow Analytics - Buyer Side`,
      deal_type: config.dealType === 'stock_purchase' ? 'SPA' : config.dealType === 'asset_purchase' ? 'APA' : 'Merger',
      status: 'active',
      parameters: {
        simulation_id: simulationId,
        simulation_role: 'buyer',
        purchase_price: config.purchasePrice,
        industry: config.industry,
        target_company: 'DataFlow Analytics, Inc.',
        buyer_entity: 'Apex Capital Partners Fund VII, L.P.',
        deal_type: config.dealType,
      },
    })
    .select('id')
    .single();

  if (buyerError) {
    throw new Error(`Failed to create buyer deal: ${buyerError.message}`);
  }

  // Create seller-side deal
  const { data: sellerDeal, error: sellerError } = await supabase
    .from('deals')
    .insert({
      name: `[SIM] DataFlow Analytics - Seller Side`,
      deal_type: buyerDeal ? 'SPA' : 'SPA',
      status: 'active',
      parameters: {
        simulation_id: simulationId,
        simulation_role: 'seller',
        purchase_price: config.purchasePrice,
        industry: config.industry,
        target_company: 'DataFlow Analytics, Inc.',
        seller_entity: 'DataFlow Analytics, Inc. Shareholders',
        deal_type: config.dealType,
      },
    })
    .select('id')
    .single();

  if (sellerError) {
    throw new Error(`Failed to create seller deal: ${sellerError.message}`);
  }

  // Extract seeded issues from VDR manifest
  const seededIssues = (seedData.vdrManifest?.seeded_issues || []).map((issue: any) => ({
    id: issue.id,
    category: issue.category,
    severity: issue.severity,
    description: issue.description,
  }));

  return {
    simulationId,
    buyerDealId: buyerDeal.id,
    sellerDealId: sellerDeal.id,
    termSheet: seedData.termSheet,
    buyerInstructions: seedData.buyerInstructions,
    sellerInstructions: seedData.sellerInstructions,
    seededIssues,
  };
}
