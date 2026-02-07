import { callClaude } from '../client';
import {
  V2_PRECEDENT_SYSTEM_PROMPT,
  getV2PrecedentPrompt,
  V3_SCRUB_SYSTEM_PROMPT,
  getV3ScrubPrompt,
} from '../prompts/document-adapter';

export interface GenerateDocumentInput {
  dealId: string;
  checklistItemId: string;
  documentType: string;
  stage: 'v1_template' | 'v2_precedent' | 'v3_scrubbed';
  templateText?: string;
  precedentText?: string;
  previousVersionText?: string;
  dealDetails?: Record<string, string>;
  dealContext?: string;
}

export interface GenerateDocumentResult {
  text: string;
  versionLabel: string;
  versionType: string;
  changeSummary?: Record<string, unknown>;
}

/**
 * Generate a document version based on the stage.
 * - v1: Select and return template text (no LLM needed)
 * - v2: Apply precedent language using LLM
 * - v3: Scrub with deal details using LLM
 */
export async function generateDocument(input: GenerateDocumentInput): Promise<GenerateDocumentResult> {
  switch (input.stage) {
    case 'v1_template':
      return generateV1(input);
    case 'v2_precedent':
      return generateV2(input);
    case 'v3_scrubbed':
      return generateV3(input);
    default:
      throw new Error(`Unknown stage: ${input.stage}`);
  }
}

/**
 * V1: Template Selection
 * No LLM needed - just select and return the appropriate template.
 */
async function generateV1(input: GenerateDocumentInput): Promise<GenerateDocumentResult> {
  if (!input.templateText) {
    throw new Error('templateText is required for v1_template stage');
  }

  return {
    text: input.templateText,
    versionLabel: 'v1_template',
    versionType: 'template',
    changeSummary: {
      stage: 'v1_template',
      description: `Template selected for ${input.documentType}`,
      source: 'template_database',
    },
  };
}

/**
 * V2: Precedent Application
 * Uses LLM to compare template against precedent and produce improved version.
 */
async function generateV2(input: GenerateDocumentInput): Promise<GenerateDocumentResult> {
  if (!input.previousVersionText) {
    throw new Error('previousVersionText is required for v2_precedent stage');
  }

  const precedentText = input.precedentText || 'No precedent available. Improve the template based on market-standard M&A practice.';
  const dealContext = input.dealContext || `Document type: ${input.documentType}`;

  const prompt = getV2PrecedentPrompt(input.previousVersionText, precedentText, dealContext);

  const result = await callClaude(
    [{ role: 'user', content: prompt }],
    {
      model: 'claude-sonnet-4-5-20250929',
      maxTokens: 8192,
      system: V2_PRECEDENT_SYSTEM_PROMPT,
    }
  );

  return {
    text: result,
    versionLabel: 'v2_precedent',
    versionType: 'precedent_applied',
    changeSummary: {
      stage: 'v2_precedent',
      description: 'Precedent language applied to template provisions',
      precedent_used: input.precedentText ? 'real_precedent' : 'market_standard',
    },
  };
}

/**
 * V3: Deal-Specific Scrub
 * Uses LLM to replace placeholders with actual deal details.
 */
async function generateV3(input: GenerateDocumentInput): Promise<GenerateDocumentResult> {
  if (!input.previousVersionText) {
    throw new Error('previousVersionText is required for v3_scrubbed stage');
  }
  if (!input.dealDetails) {
    throw new Error('dealDetails is required for v3_scrubbed stage');
  }

  const prompt = getV3ScrubPrompt(input.previousVersionText, input.dealDetails);

  const result = await callClaude(
    [{ role: 'user', content: prompt }],
    {
      model: 'claude-sonnet-4-5-20250929',
      maxTokens: 8192,
      system: V3_SCRUB_SYSTEM_PROMPT,
    }
  );

  return {
    text: result,
    versionLabel: 'v3_scrubbed',
    versionType: 'scrubbed',
    changeSummary: {
      stage: 'v3_scrubbed',
      description: 'Deal-specific details applied to document',
      placeholders_replaced: Object.keys(input.dealDetails).length,
    },
  };
}
