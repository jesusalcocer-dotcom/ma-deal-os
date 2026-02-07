/**
 * Third-Party Agent Configurations
 * Simulated escrow agents, R&W brokers, etc.
 */

import type { ThirdPartyAgentConfig } from '@ma-deal-os/core';

export const escrowAgentConfig: ThirdPartyAgentConfig = {
  role: 'escrow_agent',
  name: 'Pacific Trust Escrow Services',
  responseDelayMs: 86400000, // 1 simulated day
  deliverables: [
    'Engagement letter',
    'Escrow agreement draft',
    'Fee schedule',
    'Wire instructions',
    'Closing statement',
  ],
  complications: [
    'Request additional KYC documentation for buyer entity',
    'Flag missing authorized signatory resolution',
    'Delay wire instructions pending compliance review',
  ],
};

export const rwBrokerConfig: ThirdPartyAgentConfig = {
  role: 'rw_insurance_broker',
  name: 'Meridian Risk Advisors',
  responseDelayMs: 172800000, // 2 simulated days
  deliverables: [
    'Quote indication',
    'Underwriting questionnaire',
    'Binder',
    'Final policy',
  ],
  complications: [
    'Request additional DD information on contractor classification',
    'Exclude specific representation from coverage',
    'Require higher retention due to revenue recognition issue',
  ],
};

export const accountantConfig: ThirdPartyAgentConfig = {
  role: 'accounting_firm',
  name: 'Grant Thornton LLP',
  responseDelayMs: 259200000, // 3 simulated days
  deliverables: [
    'Quality of earnings report',
    'Working capital analysis',
    'Tax due diligence memo',
    'Net working capital peg recommendation',
  ],
  complications: [
    'Flag Meridian Corp revenue recognition for deeper analysis',
    'Identify sales tax nexus issues',
    'Request additional supporting documentation from target',
  ],
};

export const allThirdPartyConfigs: ThirdPartyAgentConfig[] = [
  escrowAgentConfig,
  rwBrokerConfig,
  accountantConfig,
];
