import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as usersSchema from './schema/users';
import * as dealsSchema from './schema/deals';
import * as checklistSchema from './schema/checklist-items';
import * as documentSchema from './schema/document-versions';
import * as provisionSchema from './schema/provision-formulations';
import * as ddSchema from './schema/dd-findings';
import * as emailSchema from './schema/emails';
import * as driveSchema from './schema/drive-sync';
import * as propagationEventsSchema from './schema/propagation-events';
import * as actionChainsSchema from './schema/action-chains';
import * as approvalPoliciesSchema from './schema/approval-policies';
import * as agentActivationsSchema from './schema/agent-activations';
import * as disclosureSchedulesSchema from './schema/disclosure-schedules';
import * as negotiationSchema from './schema/negotiation';
import * as thirdPartiesSchema from './schema/third-parties';
import * as clientManagementSchema from './schema/client-management';
import * as closingSchema from './schema/closing';

export const schema = {
  ...usersSchema,
  ...dealsSchema,
  ...checklistSchema,
  ...documentSchema,
  ...provisionSchema,
  ...ddSchema,
  ...emailSchema,
  ...driveSchema,
  ...propagationEventsSchema,
  ...actionChainsSchema,
  ...approvalPoliciesSchema,
  ...agentActivationsSchema,
  ...disclosureSchedulesSchema,
  ...negotiationSchema,
  ...thirdPartiesSchema,
  ...clientManagementSchema,
  ...closingSchema,
};

let db: ReturnType<typeof createDb> | null = null;

function createDb() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not set');
  }
  const client = postgres(connectionString, { prepare: false });
  return drizzle(client, { schema });
}

export function getDb() {
  if (!db) {
    db = createDb();
  }
  return db;
}

export type Database = ReturnType<typeof getDb>;

export { usersSchema, dealsSchema, checklistSchema, documentSchema, provisionSchema, ddSchema, emailSchema, driveSchema, propagationEventsSchema, actionChainsSchema, approvalPoliciesSchema, agentActivationsSchema, disclosureSchedulesSchema, negotiationSchema, thirdPartiesSchema, clientManagementSchema, closingSchema };
export * from './schema/users';
export * from './schema/deals';
export * from './schema/checklist-items';
export * from './schema/document-versions';
export * from './schema/provision-formulations';
export * from './schema/dd-findings';
export * from './schema/emails';
export * from './schema/drive-sync';
export * from './schema/propagation-events';
export * from './schema/action-chains';
export * from './schema/approval-policies';
export * from './schema/agent-activations';
export * from './schema/disclosure-schedules';
export * from './schema/negotiation';
export * from './schema/third-parties';
export * from './schema/client-management';
export * from './schema/closing';
