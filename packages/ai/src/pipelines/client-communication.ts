import { callClaude } from '../client';

export interface ClientCommunicationInput {
  deal_name: string;
  deal_status: string;
  deal_value?: number;
  checklist_progress: { total: number; completed: number };
  pending_action_items: Array<{ description: string; priority?: string; due_date?: string }>;
  communication_type: string;
}

export interface ClientCommunicationResult {
  subject: string;
  body: string;
  metadata: {
    model: string;
    communication_type: string;
  };
}

const SYSTEM_PROMPT = `You are an experienced M&A attorney drafting client communications. Your tone is professional, clear, and reassuring while being precise about factual matters.

You will receive deal context including the deal name, current status, checklist progress, and any pending action items from the client. Generate an appropriate client communication.

Output a JSON object with two fields:
- "subject": A concise, professional email subject line
- "body": The full email body text, formatted as plain text with appropriate paragraphs

Guidelines:
- Address the client professionally ("Dear [implied client]" or similar)
- For status updates: summarize current progress, highlight recent milestones, note upcoming deadlines
- For action item requests: clearly describe what is needed, why it's important, and the deadline
- Keep language accessible — avoid excessive legal jargon unless necessary
- Be specific about numbers and dates when provided
- End with a professional closing
- Output ONLY the JSON object, no other text.`;

export async function generateClientCommunication(
  input: ClientCommunicationInput
): Promise<ClientCommunicationResult> {
  const prompt = buildPrompt(input);

  const response = await callClaude(
    [{ role: 'user', content: prompt }],
    {
      model: 'claude-sonnet-4-5-20250929',
      maxTokens: 2048,
      system: SYSTEM_PROMPT,
    }
  );

  const jsonMatch = response.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Failed to extract JSON from client communication response');
  }

  const parsed = JSON.parse(jsonMatch[0]);
  return {
    subject: parsed.subject,
    body: parsed.body,
    metadata: {
      model: 'claude-sonnet-4-5-20250929',
      communication_type: input.communication_type,
    },
  };
}

function buildPrompt(input: ClientCommunicationInput): string {
  const dealValue = input.deal_value
    ? `$${(input.deal_value / 1_000_000).toFixed(1)}M`
    : 'undisclosed';

  const progress = `${input.checklist_progress.completed}/${input.checklist_progress.total} items complete (${Math.round((input.checklist_progress.completed / Math.max(input.checklist_progress.total, 1)) * 100)}%)`;

  let actionItemsText = 'None pending.';
  if (input.pending_action_items.length > 0) {
    actionItemsText = input.pending_action_items
      .map(
        (a) =>
          `- ${a.description}${a.priority ? ` [${a.priority}]` : ''}${a.due_date ? ` (due: ${a.due_date})` : ''}`
      )
      .join('\n');
  }

  return `Generate a "${input.communication_type}" communication for the following deal:

Deal Name: ${input.deal_name}
Deal Value: ${dealValue}
Current Status: ${input.deal_status}
Checklist Progress: ${progress}

Pending Client Action Items:
${actionItemsText}

Generate the email as a JSON object with "subject" and "body" fields.`;
}
