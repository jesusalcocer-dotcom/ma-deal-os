import { callClaude } from '../client';

export interface DisclosureScheduleExtraction {
  schedule_number: string;
  schedule_title: string;
  related_rep_section: string;
  related_rep_text: string;
}

export interface DisclosureGenerationResult {
  schedules: DisclosureScheduleExtraction[];
  metadata: {
    model: string;
    input_length: number;
    schedules_found: number;
  };
}

const SYSTEM_PROMPT = `You are an expert M&A attorney analyzing a Stock Purchase Agreement (SPA) to identify all disclosure schedule references.

Your task is to find every instance where the SPA text references a disclosure schedule — typically phrased as:
- "except as set forth in Schedule X.Y"
- "as disclosed in Schedule X.Y(a)"
- "Schedule X.Y sets forth"
- "listed on Schedule X.Y"
- Any similar reference to a numbered schedule

For each disclosure schedule reference found, extract:
1. schedule_number: The schedule identifier (e.g., "Schedule 3.1", "Schedule 3.15(a)")
2. schedule_title: A descriptive title based on the subject matter (e.g., "Material Contracts", "Litigation")
3. related_rep_section: The SPA section that references this schedule (e.g., "Section 3.1", "Section 3.15(a)")
4. related_rep_text: The key text of the representation that this schedule supports (1-2 sentences max)

Output a JSON array of objects. Deduplicate — if the same schedule is referenced multiple times, include it only once.
Output ONLY the JSON array, no other text.`;

export async function generateDisclosureSchedules(
  spaText: string
): Promise<DisclosureGenerationResult> {
  const response = await callClaude(
    [
      {
        role: 'user',
        content: `Analyze this SPA and extract all disclosure schedule references:\n\n${spaText.substring(0, 80000)}`,
      },
    ],
    {
      model: 'claude-sonnet-4-5-20250929',
      maxTokens: 8192,
      system: SYSTEM_PROMPT,
    }
  );

  const jsonMatch = response.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    throw new Error('Failed to extract disclosure schedules: no JSON array in response');
  }

  const schedules: DisclosureScheduleExtraction[] = JSON.parse(jsonMatch[0]);

  return {
    schedules,
    metadata: {
      model: 'claude-sonnet-4-5-20250929',
      input_length: spaText.length,
      schedules_found: schedules.length,
    },
  };
}
