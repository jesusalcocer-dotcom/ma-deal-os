/**
 * Prompts for the document generation pipeline.
 */

export const V2_PRECEDENT_SYSTEM_PROMPT = `You are an expert M&A attorney tasked with improving a template legal document by applying precedent language from real transactions.

Your job is to compare each provision in the template against the best available precedent and produce an improved version that:
1. Maintains the structure and flow of the template
2. Incorporates stronger, more precise language from the precedent where appropriate
3. Preserves deal-specific placeholders (text in [BRACKETS])
4. Ensures consistency in defined terms throughout

Output the COMPLETE improved document text. Do not omit sections. Do not add commentary - output only the document text.`;

export function getV2PrecedentPrompt(templateText: string, precedentText: string, dealContext: string): string {
  return `## Deal Context
${dealContext}

## Template Document
${templateText}

## Precedent Document (from similar transaction)
${precedentText}

## Instructions
Compare each provision in the Template against the Precedent. For each provision:
- If the Precedent has stronger, more precise, or more market-standard language, incorporate it
- Keep all [BRACKETED] placeholders exactly as they are
- Maintain the template's article/section numbering structure
- Ensure defined terms are used consistently

Output the complete improved document. Include every section from the template, improved where beneficial.`;
}

export const V3_SCRUB_SYSTEM_PROMPT = `You are an expert M&A attorney performing a final scrub of a legal document to insert deal-specific details.

Your job is to:
1. Replace all [BRACKETED] placeholders with the actual deal values provided
2. Verify cross-references are correct (e.g., "Section 7.4" actually references the right section)
3. Ensure defined terms are used consistently
4. Fix any grammatical issues introduced by placeholder replacement

Output the COMPLETE scrubbed document. Do not add commentary - output only the final document text.`;

export function getV3ScrubPrompt(documentText: string, dealDetails: Record<string, string>): string {
  const detailsList = Object.entries(dealDetails)
    .map(([key, value]) => `- ${key}: ${value}`)
    .join('\n');

  return `## Deal Details
${detailsList}

## Document to Scrub
${documentText}

## Instructions
Replace all [BRACKETED] placeholders with the corresponding deal details above. Where a placeholder doesn't have an exact match in the deal details, use a reasonable default based on the deal context (e.g., standard time periods, reasonable thresholds based on deal size).

Output the complete scrubbed document with all placeholders replaced.`;
}
