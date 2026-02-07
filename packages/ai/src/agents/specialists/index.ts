export { createSpecialist } from './specialist-factory';
export { drafterConfig } from './configs/drafter-config';
export { analystConfig } from './configs/analyst-config';
export { negotiationConfig } from './configs/negotiation-config';
export { emailConfig } from './configs/email-config';
export { closingConfig } from './configs/closing-config';
export { codingAgentConfig } from './configs/coding-agent-config';
export { testingAgentConfig } from './configs/testing-agent-config';

import type { SpecialistConfig } from '../types';
import { drafterConfig } from './configs/drafter-config';
import { analystConfig } from './configs/analyst-config';
import { negotiationConfig } from './configs/negotiation-config';
import { emailConfig } from './configs/email-config';
import { closingConfig } from './configs/closing-config';
import { codingAgentConfig } from './configs/coding-agent-config';
import { testingAgentConfig } from './configs/testing-agent-config';

/**
 * Registry of all pre-built specialist configurations.
 */
export const specialistRegistry: Record<string, SpecialistConfig> = {
  document_drafting: drafterConfig,
  dd_analysis: analystConfig,
  negotiation_strategy: negotiationConfig,
  email_communication: emailConfig,
  closing_mechanics: closingConfig,
  code_modification: codingAgentConfig,
  testing_validation: testingAgentConfig,
};

/**
 * Get a specialist config by task type.
 */
export function getSpecialistConfig(taskType: string): SpecialistConfig | undefined {
  return specialistRegistry[taskType];
}
