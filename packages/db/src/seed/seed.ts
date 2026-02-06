import 'dotenv/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../index';

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is required');
  }

  const client = postgres(connectionString);
  const db = drizzle(client, { schema: schema.schema });

  console.log('Seeding database...');

  // Insert sample user
  const [user] = await db.insert(schema.users).values({
    email: 'attorney@example.com',
    name: 'Sample Attorney',
    role: 'attorney',
    firm: 'Sample LLP',
  }).returning();

  console.log('Created sample user:', user.id);

  // Insert sample deal
  const [deal] = await db.insert(schema.deals).values({
    name: 'Project Mercury',
    code_name: 'Mercury',
    status: 'active',
    parameters: {
      transaction_structure: 'STOCK_PURCHASE',
      entity_types: { seller: 'PE_FUND', target: 'CORPORATION', buyer: 'CORPORATION' },
      consideration: ['CASH', 'ROLLOVER_EQUITY'],
      price_adjustments: ['WORKING_CAPITAL_ADJ', 'EARNOUT'],
      indemnification: 'COMBO_ESCROW_AND_RWI',
      escrow: true,
      holdback: false,
      regulatory: ['HSR_FILING'],
      financing: { type: 'DEBT_FINANCED', financing_condition: true },
      key_employees: { treatment: 'EMPLOYMENT_AGREEMENTS', non_competes: true },
      tsa: { required: true, direction: 'SELLER_TO_BUYER' },
      is_carveout: false,
      jurisdiction: 'DELAWARE',
    },
    deal_value: '250000000',
    industry: 'Technology',
    buyer_type: 'STRATEGIC',
    target_name: 'TargetCo Inc.',
    buyer_name: 'BuyerCorp LLC',
    seller_name: 'Seller PE Fund III',
    lead_attorney_id: user.id,
    created_by: user.id,
  }).returning();

  console.log('Created sample deal:', deal.id);
  console.log('Seed complete!');

  await client.end();
}

main().catch((e) => {
  console.error('Seed failed:', e);
  process.exit(1);
});
