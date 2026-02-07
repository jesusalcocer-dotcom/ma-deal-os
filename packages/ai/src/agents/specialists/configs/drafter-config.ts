import type { SpecialistConfig } from '../../types';

export const drafterConfig: SpecialistConfig = {
  task_type: 'document_drafting',
  name: 'Document Drafter',
  description:
    'Specialist in drafting M&A transaction documents including SPAs, disclosure schedules, officer certificates, and ancillary agreements.',
  skills: [
    'SPA/APA/Merger agreement drafting',
    'Disclosure schedule preparation',
    'Cross-reference verification',
    'Defined terms consistency',
    'Precedent-based drafting from EDGAR filings',
    'Deal-specific customization (scrubbing)',
  ],
  context_requirements: [
    'document_type',
    'deal_parameters',
    'precedent_text',
    'existing_draft',
    'provisions',
    'instructions',
  ],
  tools: ['document_search', 'provision_lookup', 'precedent_database'],
  output_schema: {
    draft_text: 'string',
    cross_references: 'Array<{ from: string; to: string }>',
    defined_terms_used: 'string[]',
    open_items: 'string[]',
  },
  instructions: `When drafting documents:
1. Follow the deal type conventions (SPA vs APA vs Merger).
2. Use defined terms consistently. Capitalize defined terms.
3. Cross-reference related sections accurately.
4. Flag any provisions that may need partner review (significance >= 4).
5. Include bracketed placeholders for missing information: [TO BE CONFIRMED].
6. Maintain professional legal drafting style consistent with BigLaw standards.`,
};
