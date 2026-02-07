import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/server';
import { callClaude } from '@ma-deal-os/ai';

export async function POST(
  _req: NextRequest,
  { params }: { params: { dealId: string } }
) {
  try {
    const { dealId } = await params;

    // Load all schedules with entries
    const { data: schedules, error } = await supabase()
      .from('disclosure_schedules')
      .select('*, disclosure_entries(*)')
      .eq('deal_id', dealId);

    if (error) {
      if (error.message?.includes('disclosure_schedules')) {
        return NextResponse.json({ error: 'Table not created yet. Run migration 007.' }, { status: 503 });
      }
      return NextResponse.json({ error: 'Failed to fetch schedules' }, { status: 500 });
    }

    if (!schedules || schedules.length === 0) {
      return NextResponse.json({ issues: [], note: 'No schedules found to cross-reference' });
    }

    // Build schedule summary for AI analysis
    const scheduleSummary = schedules.map((s: any) => ({
      number: s.schedule_number,
      title: s.schedule_title,
      rep_section: s.related_rep_section,
      entry_count: s.disclosure_entries?.length || 0,
      entries: (s.disclosure_entries || []).map((e: any) => e.entry_text).slice(0, 10),
    }));

    // Load DD findings to check coverage
    const { data: findings } = await supabase()
      .from('dd_findings')
      .select('id, title, category, severity')
      .eq('deal_id', dealId);

    const prompt = `Review these disclosure schedules for completeness and cross-reference issues.

Schedules:
${JSON.stringify(scheduleSummary, null, 2)}

DD Findings:
${JSON.stringify(findings || [], null, 2)}

Identify:
1. Schedules with no entries that should have entries
2. DD findings that aren't referenced in any schedule
3. Potential duplicate entries across schedules
4. Missing cross-references between schedules

Output a JSON array of issues: [{ schedule_number, issue_type, description, severity }]
Output ONLY the JSON array.`;

    const response = await callClaude([{ role: 'user', content: prompt }], {
      model: 'claude-sonnet-4-5-20250929',
      maxTokens: 4096,
    });

    const jsonMatch = response.match(/\[[\s\S]*\]/);
    const issues = jsonMatch ? JSON.parse(jsonMatch[0]) : [];

    // Store issues on each affected schedule
    for (const issue of issues) {
      if (issue.schedule_number) {
        const schedule = schedules.find((s: any) => s.schedule_number === issue.schedule_number);
        if (schedule) {
          const existingIssues = schedule.cross_reference_issues || [];
          await supabase()
            .from('disclosure_schedules')
            .update({ cross_reference_issues: [...existingIssues, issue] })
            .eq('id', schedule.id);
        }
      }
    }

    return NextResponse.json({ issues, schedules_checked: schedules.length });
  } catch (error) {
    console.error('Failed to cross-reference:', error);
    return NextResponse.json({ error: 'Failed to cross-reference disclosure schedules' }, { status: 500 });
  }
}
