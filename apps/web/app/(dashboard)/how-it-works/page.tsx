import Link from 'next/link';

export default function HowItWorksPage() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      {/* Header */}
      <div className="mb-12">
        <h1 className="text-3xl font-bold tracking-tight mb-3">
          How the Learning System Works
        </h1>
        <p className="text-lg text-muted-foreground">
          A plain-language guide for deal teams on how the system improves over time
        </p>
      </div>

      {/* Section 1: The Short Version */}
      <section className="mb-12">
        <h2 className="text-xl font-semibold mb-4 pb-2 border-b">
          The Short Version
        </h2>
        <div className="rounded-lg border bg-muted/20 p-6">
          <p className="text-base leading-relaxed">
            Our system gets better like a junior associate -- by doing deals,
            getting feedback, and remembering what works. Every document it drafts,
            every checklist it generates, and every negotiation position it analyzes
            becomes a learning opportunity. Over time, the system develops
            firm-specific knowledge that makes each subsequent deal faster and
            more precise.
          </p>
        </div>
      </section>

      {/* Section 2: How It Works */}
      <section className="mb-12">
        <h2 className="text-xl font-semibold mb-6 pb-2 border-b">
          How It Works
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Step 1: DO */}
          <div className="rounded-lg border p-6">
            <div className="flex items-center gap-3 mb-3">
              <span className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-700 text-sm font-bold">
                1
              </span>
              <h3 className="text-lg font-semibold">Do</h3>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              AI agents process tasks -- drafting documents, analyzing terms,
              generating checklists, and evaluating provisions. Each task produces
              a concrete output that can be measured and compared.
            </p>
          </div>

          {/* Step 2: CHECK */}
          <div className="rounded-lg border p-6">
            <div className="flex items-center gap-3 mb-3">
              <span className="flex items-center justify-center w-8 h-8 rounded-full bg-amber-100 text-amber-700 text-sm font-bold">
                2
              </span>
              <h3 className="text-lg font-semibold">Check</h3>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Every output is evaluated for quality -- automatically by the system
              and through your edits, corrections, and approvals. When you revise
              an agent&apos;s draft, that revision becomes a quality signal the system
              tracks.
            </p>
          </div>

          {/* Step 3: SPOT PATTERNS */}
          <div className="rounded-lg border p-6">
            <div className="flex items-center gap-3 mb-3">
              <span className="flex items-center justify-center w-8 h-8 rounded-full bg-purple-100 text-purple-700 text-sm font-bold">
                3
              </span>
              <h3 className="text-lg font-semibold">Spot Patterns</h3>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              A reflection engine periodically reviews accumulated signals to
              identify recurring improvements. If multiple deals show the same type
              of correction, the system recognizes it as a pattern worth encoding
              into future behavior.
            </p>
          </div>

          {/* Step 4: APPLY */}
          <div className="rounded-lg border p-6">
            <div className="flex items-center gap-3 mb-3">
              <span className="flex items-center justify-center w-8 h-8 rounded-full bg-green-100 text-green-700 text-sm font-bold">
                4
              </span>
              <h3 className="text-lg font-semibold">Apply</h3>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Validated patterns are injected into future agent prompts as
              contextual knowledge. The agents receive firm-specific guidance
              alongside their general legal training, producing outputs that match
              your standards from the first draft.
            </p>
          </div>
        </div>
      </section>

      {/* Section 3: What You Control */}
      <section className="mb-12">
        <h2 className="text-xl font-semibold mb-4 pb-2 border-b">
          What You Control
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          The learning system is fully configurable. You decide how aggressively it
          learns and where the guardrails are.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            href="/settings/models"
            className="block rounded-lg border p-5 hover:border-blue-300 hover:bg-blue-50/50 transition-colors"
          >
            <h3 className="text-sm font-semibold mb-1">Model Routing</h3>
            <p className="text-xs text-muted-foreground">
              Choose which AI model handles each task type. Control
              Opus-to-Sonnet distillation and handoff thresholds.
            </p>
          </Link>
          <Link
            href="/settings/learning"
            className="block rounded-lg border p-5 hover:border-blue-300 hover:bg-blue-50/50 transition-colors"
          >
            <h3 className="text-sm font-semibold mb-1">Learning Settings</h3>
            <p className="text-xs text-muted-foreground">
              Toggle signal collection, pattern detection, and knowledge
              injection on or off. Set reflection frequency and thresholds.
            </p>
          </Link>
          <Link
            href="/settings/spend"
            className="block rounded-lg border p-5 hover:border-blue-300 hover:bg-blue-50/50 transition-colors"
          >
            <h3 className="text-sm font-semibold mb-1">Spend Controls</h3>
            <p className="text-xs text-muted-foreground">
              Set budget limits per deal and per month. Monitor AI costs across
              all agent activities and learning operations.
            </p>
          </Link>
        </div>
      </section>

      {/* Section 4: Trust & Safety */}
      <section className="mb-12">
        <h2 className="text-xl font-semibold mb-4 pb-2 border-b">
          Trust and Safety
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="rounded-lg border p-6">
            <h3 className="text-sm font-semibold text-red-700 mb-3 uppercase tracking-wide">
              The System Never
            </h3>
            <ul className="space-y-2.5">
              <li className="flex items-start gap-2 text-sm text-muted-foreground">
                <span className="mt-0.5 text-red-400 font-bold text-xs">X</span>
                Makes legal decisions without human approval
              </li>
              <li className="flex items-start gap-2 text-sm text-muted-foreground">
                <span className="mt-0.5 text-red-400 font-bold text-xs">X</span>
                Sends communications to clients or counterparties autonomously
              </li>
              <li className="flex items-start gap-2 text-sm text-muted-foreground">
                <span className="mt-0.5 text-red-400 font-bold text-xs">X</span>
                Shares data between deals or clients without explicit configuration
              </li>
              <li className="flex items-start gap-2 text-sm text-muted-foreground">
                <span className="mt-0.5 text-red-400 font-bold text-xs">X</span>
                Modifies finalized or executed documents
              </li>
              <li className="flex items-start gap-2 text-sm text-muted-foreground">
                <span className="mt-0.5 text-red-400 font-bold text-xs">X</span>
                Overrides attorney-set approval policies or escalation rules
              </li>
              <li className="flex items-start gap-2 text-sm text-muted-foreground">
                <span className="mt-0.5 text-red-400 font-bold text-xs">X</span>
                Trains on your data outside your environment -- all learning is local
              </li>
            </ul>
          </div>
          <div className="rounded-lg border p-6">
            <h3 className="text-sm font-semibold text-green-700 mb-3 uppercase tracking-wide">
              The System Always
            </h3>
            <ul className="space-y-2.5">
              <li className="flex items-start gap-2 text-sm text-muted-foreground">
                <span className="mt-0.5 text-green-500 font-bold text-xs">+</span>
                Logs every action to the audit trail for complete transparency
              </li>
              <li className="flex items-start gap-2 text-sm text-muted-foreground">
                <span className="mt-0.5 text-green-500 font-bold text-xs">+</span>
                Requires human approval before promoting learned patterns to active use
              </li>
              <li className="flex items-start gap-2 text-sm text-muted-foreground">
                <span className="mt-0.5 text-green-500 font-bold text-xs">+</span>
                Provides one-click revert for any automated change
              </li>
              <li className="flex items-start gap-2 text-sm text-muted-foreground">
                <span className="mt-0.5 text-green-500 font-bold text-xs">+</span>
                Runs consistency checks to detect contradictions across deals
              </li>
              <li className="flex items-start gap-2 text-sm text-muted-foreground">
                <span className="mt-0.5 text-green-500 font-bold text-xs">+</span>
                Respects deal-level information barriers and access controls
              </li>
              <li className="flex items-start gap-2 text-sm text-muted-foreground">
                <span className="mt-0.5 text-green-500 font-bold text-xs">+</span>
                Operates within the budget limits you set -- never exceeds spend caps
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Section 5: FAQ */}
      <section className="mb-12">
        <h2 className="text-xl font-semibold mb-4 pb-2 border-b">
          Frequently Asked Questions
        </h2>
        <div className="space-y-6">
          <div>
            <h3 className="text-sm font-semibold mb-1">
              Will the system change how it drafts documents without telling me?
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              No. All learned patterns go through a promotion pipeline: they start
              as candidates, require validation against multiple data points, and
              must pass quality thresholds before becoming active. You can review
              pending patterns in the settings and reject any you disagree with.
              Every change is logged in the audit trail.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold mb-1">
              Does the system use my deal data to improve itself for other firms?
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              No. All learning is local to your environment. Patterns, exemplars,
              and signals never leave your instance. The underlying AI models
              (Claude) do not train on your inputs. Your deal data stays yours.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold mb-1">
              What happens if the system learns something incorrect?
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              The consistency checker runs regularly to detect contradictions
              between learned patterns. If a pattern produces lower-quality
              outputs, the system automatically flags it for review. You can also
              manually demote or delete any pattern through the Observer dashboard.
              Reverting a pattern immediately removes its influence on future
              outputs.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold mb-1">
              How does Opus-to-Sonnet distillation work, and does it reduce quality?
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              For routine tasks, the system can transfer knowledge from the more
              capable Opus model to the faster, less expensive Sonnet model.
              This happens through exemplar-based learning: Opus outputs that
              score highly become training examples for Sonnet. Sonnet only takes
              over a task type after passing rigorous quality trials. If quality
              drops below the revert threshold, the system automatically switches
              back to Opus.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold mb-1">
              Can I turn the learning system off entirely?
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Yes. You can disable signal collection, pattern detection, and
              knowledge injection independently through the{' '}
              <Link
                href="/settings/learning"
                className="text-blue-600 hover:underline"
              >
                Learning Settings
              </Link>{' '}
              page. With all three disabled, the system operates as a static tool
              with no adaptive behavior. You can re-enable any component at any
              time without losing previously learned patterns.
            </p>
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <div className="rounded-lg border border-dashed p-6 text-center">
        <p className="text-sm text-muted-foreground mb-3">
          Want to see the learning system in action?
        </p>
        <div className="flex justify-center gap-3">
          <Link
            href="/learning/audit"
            className="rounded border px-4 py-2 text-sm hover:bg-muted/50 transition-colors"
          >
            View Audit Trail
          </Link>
          <Link
            href="/settings/learning"
            className="rounded bg-blue-600 text-white px-4 py-2 text-sm hover:bg-blue-700 transition-colors"
          >
            Configure Settings
          </Link>
        </div>
      </div>
    </div>
  );
}
