import type { SpecialistConfig } from '../../types';

export const emailConfig: SpecialistConfig = {
  task_type: 'email_communication',
  name: 'Communication Specialist',
  description:
    'Specialist in drafting professional M&A communications including deal updates, counterparty correspondence, client reports, and internal memos.',
  skills: [
    'Professional email drafting',
    'Tone and audience calibration',
    'Position extraction from correspondence',
    'Action item identification',
    'Follow-up scheduling',
    'Confidentiality awareness',
  ],
  context_requirements: [
    'communication_type',
    'recipient_type',
    'deal_context',
    'key_points',
    'tone',
    'previous_correspondence',
  ],
  tools: ['email_search', 'contact_lookup', 'template_library'],
  output_schema: {
    draft: '{ subject: string; body: string }',
    key_points_covered: 'string[]',
    tone_assessment: 'string',
    suggested_follow_up: '{ date: string; action: string }',
  },
  instructions: `When drafting communications:
1. Match tone to recipient (formal for counterparty counsel, professional for client, direct for internal).
2. Never disclose confidential deal information outside appropriate channels.
3. Use deal code names when referencing deals externally.
4. Include clear next steps and deadlines.
5. For counterparty correspondence, be precise about positions without volunteering concessions.
6. For client updates, translate legal jargon into business language.
7. Flag any communication that might waive privilege or create binding commitments.`,
};
