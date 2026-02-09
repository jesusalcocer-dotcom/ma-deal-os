import type { EmailClassification } from '@ma-deal-os/core';
import { callClaude } from '../client';

export interface EmailForClassification {
  id: string;
  subject: string;
  from: string;
  fromName: string;
  snippet: string;
  bodyText: string;
  hasAttachments: boolean;
  attachmentFilenames?: string[];
}

export interface ClassifiedEmail {
  id: string;
  classification: EmailClassification;
  confidence: number;
  reasoning: string;
  deal_relevance: boolean;
  suggested_deal_id?: string;
  key_entities: string[];
}

export interface EmailClassificationResult {
  classified: ClassifiedEmail[];
  metadata: {
    model: string;
    total_emails: number;
    deal_relevant: number;
    classifications: Record<string, number>;
  };
}

const KEYWORD_PREFILTER: Record<string, string[]> = {
  markup_delivery: ['markup', 'redline', 'blackline', 'revised draft', 'clean copy', 'attached draft', 'turn of'],
  comment_letter: ['comments', 'comment letter', 'issues list', 'open items', 'proposed changes'],
  dd_response: ['due diligence', 'diligence request', 'data room', 'vdr', 'document request'],
  scheduling: ['schedule', 'calendar', 'availability', 'signing', 'closing date', 'timeline'],
};

export function keywordPreFilter(subject: string, bodyPreview: string): EmailClassification | null {
  const text = `${subject} ${bodyPreview}`.toLowerCase();
  for (const [classification, keywords] of Object.entries(KEYWORD_PREFILTER)) {
    if (keywords.some(kw => text.includes(kw))) {
      return classification as EmailClassification;
    }
  }
  return null;
}

const SYSTEM_PROMPT = `You are an expert M&A legal assistant. You classify emails received during an M&A transaction.

For each email, determine:
1. classification: One of: "markup_delivery", "comment_letter", "dd_response", "scheduling", "general", "unclassified"
   - markup_delivery: Contains or references a revised/marked-up document draft
   - comment_letter: Contains comments, issues lists, or proposed changes to deal terms
   - dd_response: Due diligence responses, data room uploads, document production
   - scheduling: Meeting scheduling, timeline updates, signing/closing coordination
   - general: Deal-related but doesn't fit other categories (status updates, introductions, etc.)
   - unclassified: Not related to any active M&A deal
2. confidence: 0.0 to 1.0 — how confident you are in the classification
3. deal_relevance: true if this email relates to any M&A deal activity, false otherwise
4. reasoning: One sentence explaining why you chose this classification
5. key_entities: Array of key entity names mentioned (companies, people, deal names)

Return a JSON array of objects with fields: id, classification, confidence, deal_relevance, reasoning, key_entities.
Output ONLY the JSON array, no other text.`;

function buildBatchPrompt(emails: EmailForClassification[]): string {
  const entries = emails.map((e, i) => {
    const attachInfo = e.hasAttachments
      ? `\nAttachments: ${e.attachmentFilenames?.join(', ') || 'yes'}`
      : '';
    const body = e.bodyText.slice(0, 2000);
    return `--- Email ${i + 1} (id: ${e.id}) ---
From: ${e.fromName} <${e.from}>
Subject: ${e.subject}${attachInfo}
Body preview:
${body}`;
  });

  return `Classify the following ${emails.length} emails:\n\n${entries.join('\n\n')}`;
}

export async function classifyEmails(
  emails: EmailForClassification[],
): Promise<EmailClassificationResult> {
  if (emails.length === 0) {
    return {
      classified: [],
      metadata: { model: 'claude-sonnet-4-5-20250929', total_emails: 0, deal_relevant: 0, classifications: {} },
    };
  }

  // Apply cheap keyword pre-filter first
  const needsClaude: EmailForClassification[] = [];
  const preFiltered: ClassifiedEmail[] = [];

  for (const email of emails) {
    const kw = keywordPreFilter(email.subject, email.snippet);
    if (kw) {
      preFiltered.push({
        id: email.id,
        classification: kw,
        confidence: 0.6, // lower confidence for keyword match
        reasoning: `Keyword pre-filter match for ${kw}`,
        deal_relevance: true,
        key_entities: [],
      });
    } else {
      needsClaude.push(email);
    }
  }

  let claudeResults: ClassifiedEmail[] = [];

  if (needsClaude.length > 0) {
    // Batch into groups of 20 to stay within token limits
    const batchSize = 20;
    for (let i = 0; i < needsClaude.length; i += batchSize) {
      const batch = needsClaude.slice(i, i + batchSize);
      const prompt = buildBatchPrompt(batch);

      const response = await callClaude(
        [{ role: 'user', content: prompt }],
        {
          model: 'claude-sonnet-4-5-20250929',
          maxTokens: 4096,
          system: SYSTEM_PROMPT,
        },
      );

      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[0]) as ClassifiedEmail[];
          claudeResults.push(...parsed);
        } catch {
          // If JSON parse fails, mark all as unclassified
          for (const email of batch) {
            claudeResults.push({
              id: email.id,
              classification: 'unclassified',
              confidence: 0,
              reasoning: 'Classification failed — JSON parse error',
              deal_relevance: false,
              key_entities: [],
            });
          }
        }
      }
    }
  }

  // Merge pre-filtered + Claude results, then upgrade pre-filtered if Claude also classified
  const claudeById = new Map(claudeResults.map(r => [r.id, r]));
  const allResults: ClassifiedEmail[] = [];

  for (const pf of preFiltered) {
    const claudeResult = claudeById.get(pf.id);
    if (claudeResult && claudeResult.confidence > pf.confidence) {
      allResults.push(claudeResult);
    } else {
      allResults.push(pf);
    }
    claudeById.delete(pf.id);
  }

  // Add remaining Claude results
  for (const cr of claudeById.values()) {
    allResults.push(cr);
  }

  // Build classification counts
  const classifications: Record<string, number> = {};
  let dealRelevant = 0;
  for (const r of allResults) {
    classifications[r.classification] = (classifications[r.classification] ?? 0) + 1;
    if (r.deal_relevance) dealRelevant++;
  }

  return {
    classified: allResults,
    metadata: {
      model: 'claude-sonnet-4-5-20250929',
      total_emails: emails.length,
      deal_relevant: dealRelevant,
      classifications,
    },
  };
}
