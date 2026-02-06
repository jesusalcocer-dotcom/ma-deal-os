import Anthropic from '@anthropic-ai/sdk';

let client: Anthropic | null = null;

export function getAnthropicClient(): Anthropic {
  if (!client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY environment variable is not set');
    }
    client = new Anthropic({ apiKey });
  }
  return client;
}

export async function callClaude(
  messages: Anthropic.MessageParam[],
  options: {
    model?: string;
    maxTokens?: number;
    system?: string;
  } = {}
): Promise<string> {
  const anthropic = getAnthropicClient();
  const { model = 'claude-sonnet-4-5-20250929', maxTokens = 4096, system } = options;

  let lastError: Error | null = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await anthropic.messages.create({
        model,
        max_tokens: maxTokens,
        system: system || undefined,
        messages,
      });

      const textBlock = response.content.find((b) => b.type === 'text');
      return textBlock?.text ?? '';
    } catch (error) {
      lastError = error as Error;
      if (attempt < 2) {
        await new Promise((r) => setTimeout(r, Math.pow(2, attempt) * 1000));
      }
    }
  }
  throw lastError;
}
