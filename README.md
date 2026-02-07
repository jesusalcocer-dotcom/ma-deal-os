# M&A Deal Operating System

Agent-driven M&A deal execution platform. A two-person team -- one human partner making strategic decisions, one agent system handling everything else.

## Architecture

Three-layer automation stack:
- **Layer 1 (Deterministic):** Rules engine, state machines, data transforms. Cheap, fast, predictable.
- **Layer 2 (AI API):** Single-turn Claude calls for parsing, classification, drafting. Structured input/output.
- **Layer 3 (Agents):** Multi-step reasoning for strategic synthesis, investigation, coordination.

## Current Status

| Phase | Title | Status |
|-------|-------|--------|
| 0 | Scaffold & Infrastructure | COMPLETE |
| 1 | Core Deal Flow | COMPLETE |
| 2 | Document Generation Pipeline | COMPLETE |
| 3 | MCP Infrastructure + Event Backbone | TODO |
| 4 | Approval Framework | TODO |
| 5 | Disclosure Schedules + Negotiation | TODO |
| 6 | Closing + Client + Third-Party | TODO |
| 7 | Agent Layer (Manager, Specialists) | TODO |
| 8 | Skills System | TODO |
| 9 | Partner Constitution | TODO |
| 10 | Precedent Intelligence Pipeline | TODO |
| 11 | Observer + Self-Improvement | TODO |
| 12 | Simulation Framework | TODO |
| 13 | Mobile Approval Interface | TODO |
| 14 | Knowledge Capture + Learning | TODO |

## What's Built (Phases 0-2)

- Monorepo: `apps/web` (Next.js), `packages/core`, `packages/db`, `packages/ai`, `packages/integrations`
- 14 Supabase tables with Drizzle ORM
- Deal CRUD + term sheet parsing (Claude API)
- Checklist rules engine + generation
- Document pipeline: v1 template -> v2 precedent (Claude) -> v3 deal scrub (Claude)
- 50 SPA provision types, 10 EDGAR precedent deals
- Provision segmenter (47 tagged sections)
- DOCX generation + Google Drive integration
- Web UI: deal list, deal detail, checklist, documents with version history
- Test deal "Project Mercury" ($185M stock purchase, Delaware)

## Repository Structure

```
ma-deal-os/
├── apps/web/              Next.js app (pages, API routes, components)
├── packages/
│   ├── core/              Business logic, types, rules engine
│   ├── db/                Drizzle ORM schema
│   ├── ai/                Claude API pipelines + agents
│   ├── integrations/      Drive, email, documents, precedent
│   └── mcp-server/        MCP server for agent tools
├── skills/                Phase build instructions + agent skills
├── scripts/               Build and test scripts
├── test-data/             Test fixtures
├── docs/test-results/     Phase test reports
├── CLAUDE.md              Autonomous build protocol
├── BUILD_STATE.json       Session continuity state
└── SPEC-V2-COMPLETE.md    Full specification (V1+V2 merged)
```

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 9+
- Supabase project with pgvector extension
- Anthropic API key
- Google Cloud service account (for Drive)

### Setup

```bash
# Install dependencies
pnpm install

# Configure environment
cp .env.example .env.local
# Edit .env.local with your credentials

# Build all packages
pnpm build

# Start development server
pnpm dev
```

### Autonomous Build

The system is designed to be built by Claude Code autonomously, phase by phase:

```bash
# Check current phase and validate environment
./scripts/autonomous-runner.sh

# Or override to a specific phase
./scripts/autonomous-runner.sh 3

# Auto-launch Claude Code
AUTO_LAUNCH=true ./scripts/autonomous-runner.sh
```

Each phase has a skill file (`skills/phase-NN.md`) with step-by-step build instructions, test commands, and acceptance criteria.

## Key Files

| File | Purpose |
|------|---------|
| `CLAUDE.md` | Build protocol -- read this first every session |
| `BUILD_STATE.json` | Current phase, step, blockers, session history |
| `SPEC-V2-COMPLETE.md` | Complete merged specification |
| `skills/phase-NN.md` | Step-by-step build instructions per phase |
| `docs/test-results/` | Test reports from completed phases |

## Technology Stack

| Component | Technology |
|-----------|-----------|
| Language | TypeScript 5.x |
| Runtime | Node.js 20 LTS |
| Web Framework | Next.js 14+ (App Router) |
| Database | Supabase (PostgreSQL 15+) |
| ORM | Drizzle |
| LLM | Claude (Anthropic API) |
| Agent Protocol | Model Context Protocol (MCP) |
| File Storage | Supabase Storage + Google Drive |
| Email | Microsoft Graph API (Outlook) |
| Styling | Tailwind CSS + shadcn/ui |
| Monorepo | pnpm + Turborepo |
