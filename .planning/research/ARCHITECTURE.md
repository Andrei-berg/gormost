# Architecture Research

**Domain:** AI "work dispatcher" (LLM/STT structured-extraction layer) bolted onto an existing Next.js 16 / Supabase / Vercel operations app (Gormost, Russian-language)
**Researched:** 2026-09-01
**Confidence:** HIGH for integration points (read from source), MEDIUM for provider-API specifics (not re-verified this session; standard REST patterns)

---

## Executive Answer to the Five Questions

1. **Split by nature of the call.** Plain KB CRUD (vocabulary, aliases, staging rows, review queue, correction log) goes through the existing `/api/db` dispatcher as a new domain module `src/lib/api/knowledge.ts`. LLM/STT invocation, audio upload, and workbook parsing go in a **new `/api/agent/*` route group** that does its own `verifySessionToken` + role check (exactly like the existing `/api/timesheet/export` route). Reason: the dispatcher returns one `NextResponse.json({data})` blob — no streaming, no multipart — and every function it exposes becomes reachable by name for any valid session via `import * as api`. You do not want raw provider calls on that reflection surface.
2. **Adapters are dumb transport.** A `src/lib/agent/` tree with an `LlmAdapter` / `SttAdapter` interface whose only job is `normalized request -> text`. Prompt building, JSON validation, guardrails ("no invented entities"), confidence scoring, threshold routing, and logging all sit **above** the adapter in `extract/index.ts` + `guardrails.ts` + `confidence.ts` + `log.ts`. Provider + model resolved once in `config.ts` from env; the only `switch(provider)` is the adapter factory.
3. **Bridge, do not reconcile.** Reconciling the three existing catalogs is its own milestone and would touch live `requests`. Add a **fourth catalog** — the agent knowledge base (`kb_*` tables) — that is the agent's canonical vocabulary, carrying nullable *bridge columns* to the other three (`journal_object_id`, `main_object_id`, `main_work_type_id`, `work_permit_type_id`). The agent reads/writes only its own tables and *emits* `daily_plan_items` referencing `journal_objects`.
4. **Reuse the existing unpublished-row seam.** `createDailyPlanItem()` already writes a row with `published=false`; publish is a separate explicit slice-level action. The agent's "Создать черновики" loops accepted drafts through the same `createDailyPlanItem` path. Nothing in the manual journal flow changes; the `work_plans` funnel is never touched.
5. **Phases 8-13.** 8: KB schema + RLS + CRUD. 9: xls ingest / training tool (ADMIN). 10: provider-agnostic adapter + `extractPlan`. 11: dictation review UI, text path, commit to drafts. 12: voice capture + STT. 13 (optional): learn-from-correction loop + low-confidence queue UI. KB before extraction; adapter before UI; text before voice.

---

## Standard Architecture

### System Overview

```
┌──────────────────────────────────────────────────────────────────────────┐
│                              BROWSER (client)                             │
│  ┌────────────────────────┐   ┌──────────────────────┐  ┌──────────────┐  │
│  │ /journal JournalApp    │   │ /dispatcher panel    │  │ /admin       │  │
│  │  "🎤 Надиктовать план" │   │  "🎤 Надиктовать"    │  │  KB training │  │
│  │  DictationReview modal  │   │  DictationReview      │  │  tool (xls)  │  │
│  └───────────┬────────────┘   └──────────┬───────────┘  └──────┬───────┘  │
│              │ agent-client.ts           │ agent-client.ts     │ api-client │
│              │ (fetch /api/agent/*)      │                     │ (fetch /api/db)
└──────────────┼───────────────────────────┼─────────────────────┼──────────┘
               │                           │                     │
┌──────────────▼───────────────────────────▼──────┐   ┌──────────▼──────────┐
│           NEW  /api/agent/*  route group          │   │  /api/db dispatcher │
│  verifySessionToken(gormost_token) + role check   │   │  (unchanged)        │
│  ┌────────────┐ ┌────────────┐ ┌───────────────┐  │   │  + knowledge.ts     │
│  │ /extract   │ │ /transcribe│ │ /ingest       │  │   │    module CRUD:     │
│  │ text->JSON │ │ audio->text│ │ xls->staging  │  │   │  kb_* / agent_*     │
│  └─────┬──────┘ └─────┬──────┘ └──────┬────────┘  │   │  fetch/create/apply │
│        │              │               │            │   └──────────┬─────────┘
│  ┌─────▼──────────────▼───────────────▼─────────┐  │              │
│  │            src/lib/agent/  (server)          │  │              │
│  │  config.ts  → resolveAgentConfig() (env)     │  │              │
│  │  extract/index.ts → prompt + validate +      │  │              │
│  │       guardrails + confidence + log          │  │              │
│  │  guardrails.ts   confidence.ts   log.ts      │  │              │
│  │  ingest/workbook.ts  ingest/classify.ts      │  │              │
│  │  ┌───────────────── adapter factory ──────┐  │  │              │
│  │  │ LlmAdapter:  anthropic | openai |      │  │  │              │
│  │  │   yandexgpt | gigachat | selfhosted    │  │  │              │
│  │  │ SttAdapter:  whisper | speechkit |     │  │  │              │
│  │  │   selfhosted-whisper                   │  │  │              │
│  │  └──────────────┬────────────────────────┘  │  │              │
│  └─────────────────┼──────────────────────────┘  │              │
└────────────────────┼─────────────────────────────┘              │
                     │ HTTPS (server-only API keys)               │
          ┌──────────▼───────────┐                    ┌────────────▼───────────┐
          │  LLM / STT providers │                    │  Supabase (Postgres)   │
          │  Anthropic / OpenAI  │                    │  anon key + RLS        │
          │  YandexGPT / GigaChat│                    │  anon_all_<table>      │
          │  self-hosted         │                    │  kb_*  agent_*         │
          └──────────────────────┘                    │  daily_plan_items      │
                                                      │  journal_objects       │
                                                      └────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Implementation |
|-----------|----------------|----------------|
| `/api/agent/extract` | Accept `{text, planDate, context?}`, return `{drafts, parseLogId}`; own auth + role gate | Next.js route handler, `runtime='nodejs'`, `dynamic='force-dynamic'`, `maxDuration` bumped for LLM latency |
| `/api/agent/transcribe` | Accept `multipart/form-data` audio blob, return `{text, confidence?}` | Route handler; reads `req.formData()`; passes bytes to `SttAdapter` |
| `/api/agent/ingest` | Accept `multipart` xls/xlsx, parse to `kb_ingest_rows` staging, return batch id | Route handler; SheetJS parse (new dep — needs sign-off) |
| `src/lib/agent/config.ts` | Single source for provider/model/base-URL/keys from env | `resolveAgentConfig(): AgentConfig` — typed, defaulted |
| `src/lib/agent/extract/index.ts` | Orchestrate: build prompt, call adapter, parse+validate JSON, run guardrails, score confidence, write `agent_parse_log` | Pure-ish orchestrator; no provider branching |
| `src/lib/agent/extract/adapters/*` | Turn `LlmRequest` -> text; provider auth quirks (GigaChat OAuth, Yandex folder id) | One `fetch` per provider; no business logic |
| `src/lib/agent/guardrails.ts` | Drop/flag drafts whose object/service/work do not resolve against KB; clamp crew counts; assign `reviewStatus` by threshold | Pure function `validateDrafts(drafts, kbIndex)` — unit-tested (TDD) |
| `src/lib/agent/confidence.ts` | Combine model-reported confidence + KB match strength + heuristics into `0..1` | Pure function — unit-tested |
| `src/lib/agent/ingest/workbook.ts` | Sheet -> raw rows; detect sheet kind (Титул / Конструктив / Годовой план) | SheetJS; pure transform |
| `src/lib/agent/ingest/classify.ts` | Raw row -> `{entityType, canonicalName, serviceGuess, unit, area}` | Heuristics + alias lookup; optional LLM assist |
| `src/lib/api/knowledge.ts` | Ordinary Supabase CRUD for `kb_*` / `agent_*`; reached via `/api/db` | Mirrors `src/lib/api/journal.ts` style |
| `src/lib/agent-client.ts` | Typed browser wrappers for `/api/agent/*`; mirrors `api-client.ts` 401 handling | ~6 functions total |
| `src/components/journal/DictationReview.tsx` | Editable grid of proposed drafts, confidence chips, source phrase, per-row accept/edit/reassign; commit loop | Reuses `AddItemModal` field set; calls `createDailyPlanItem` per accepted row |

---

## Recommended Project Structure

```
src/
├── app/
│   └── api/
│       ├── db/route.ts                 # UNCHANGED — generic dispatcher
│       ├── auth/…                       # UNCHANGED
│       ├── timesheet/export/route.ts    # existing precedent for a bespoke route
│       └── agent/                        # NEW route group
│           ├── extract/route.ts          #   POST text  -> drafts JSON (SSE optional later)
│           ├── transcribe/route.ts       #   POST audio -> text  (multipart)
│           ├── ingest/route.ts           #   POST xls   -> staging batch (multipart)
│           └── correction/route.ts       #   POST human-vs-model diff -> agent_corrections
│
├── lib/
│   ├── api/
│   │   ├── journal.ts                    # UNCHANGED (reference style)
│   │   ├── catalog.ts                    # UNCHANGED
│   │   └── knowledge.ts                  # NEW — kb_* / agent_* CRUD, dispatched via /api/db
│   ├── api.ts                            # + 1 line:  export * from './api/knowledge'
│   ├── api-client.ts                     # + ~10 manual wrappers for knowledge.ts fns
│   ├── agent-client.ts                   # NEW — typed wrappers for /api/agent/*
│   └── agent/                            # NEW — provider-agnostic AI layer (server-only)
│       ├── index.ts                      #   getExtractor(), getTranscriber()
│       ├── config.ts                     #   resolveAgentConfig() — env is the single source
│       ├── types.ts                      #   PlanDraft, ExtractInput/Result, TranscribeResult, ProviderId
│       ├── guardrails.ts                 #   validateDrafts(drafts, kbIndex)   [pure, tested]
│       ├── confidence.ts                 #   scoreDraft(...)                    [pure, tested]
│       ├── log.ts                        #   recordParse(), recordCorrection()
│       ├── kb-index.ts                   #   buildKbIndex(): normalized lookup maps for guardrails
│       ├── extract/
│       │   ├── index.ts                  #   extractPlan(input, cfg)
│       │   ├── prompt.ts                 #   buildExtractPrompt(kbSlice, text, fewShot)  [pure, tested]
│       │   ├── parse.ts                  #   parseModelJson(raw) -> PlanDraft[]           [pure, tested]
│       │   ├── adapter.ts                #   interface LlmAdapter { id; complete(req): Promise<LlmResponse> }
│       │   └── adapters/
│       │       ├── anthropic.ts
│       │       ├── openai.ts
│       │       ├── yandexgpt.ts
│       │       ├── gigachat.ts           #   note: OAuth token exchange + cert quirks
│       │       └── selfhosted.ts         #   OpenAI-compatible base URL
│       ├── transcribe/
│       │   ├── index.ts                  #   transcribe(bytes, mime, cfg)
│       │   ├── adapter.ts                #   interface SttAdapter { id; transcribe(bytes,mime,opts) }
│       │   └── adapters/
│       │       ├── openai-whisper.ts
│       │       ├── yandex-speechkit.ts
│       │       └── selfhosted-whisper.ts
│       └── ingest/
│           ├── workbook.ts               #   parseWorkbook(bytes) -> RawRow[]   (SheetJS)
│           └── classify.ts               #   RawRow -> ParsedRow
│
├── components/
│   ├── journal/
│   │   ├── JournalApp.tsx                # MODIFIED — add "🎤 Надиктовать план" button + modal mount (~15 lines)
│   │   ├── DictationReview.tsx           # NEW — proposal review grid + commit loop
│   │   └── data.ts                       # MODIFIED — reuse norm(); maybe export a resolveObject helper
│   ├── dispatcher/
│   │   └── DictationEntry.tsx            # NEW — same entry point on the dispatcher panel
│   └── admin/
│       ├── KbTrainingTab.tsx             # NEW — xls upload -> staging -> diff preview -> apply
│       ├── KbAliasTab.tsx               # NEW — alias/synonym CRUD
│       └── KbReviewQueueTab.tsx          # NEW — low-confidence parse review
│
└── types/index.ts                        # MODIFIED — KbLocation, KbConstruction, KbWorkType, KbAlias,
                                          #   KbIngestBatch, KbIngestRow, AgentParseLog, AgentCorrection,
                                          #   AgentReviewItem, PlanDraft, AgentConfig, ProviderId
```

### Structure Rationale

- **`src/lib/agent/` is server-only and provider-shaped, not domain-shaped.** It sits beside `src/lib/api/`, not inside it, because `import * as api from '@/lib/api'` in the dispatcher would otherwise auto-expose `extractPlan` as a callable RPC name. Keeping it out of the barrel is the guardrail.
- **`knowledge.ts` *is* domain-shaped** and belongs in `src/lib/api/` — it is plain CRUD with the same shape as `journal.ts`, benefits from the dispatcher's auth + role gating for free, and its handful of extra manual `api-client.ts` wrappers are acceptable (the project already keeps ~50 in sync by hand).
- **`agent-client.ts` is a sibling of `api-client.ts`**, not part of it: the `/api/agent/*` calls are few (~6), some send multipart bodies, some may stream — they do not fit the `call(fn, args[])` JSON shape.
- **Adapters live two levels deep** (`extract/adapters/`, `transcribe/adapters/`) so the interface file (`adapter.ts`) sits next to its implementations and the orchestrator (`index.ts`) never imports an adapter directly — only the factory does.

---

## Architectural Patterns

### Pattern 1: Bespoke route beside the dispatcher (not inside it)

**What:** LLM/STT/ingest endpoints are their own Next.js route handlers under `/api/agent/*`. Each repeats the ~3-line auth preamble from `/api/timesheet/export`: `verifySessionToken(req.cookies.get('gormost_token')?.value)` -> 401 if falsy, then inline `auth.role_level` check against an allow-list.

**When to use:** any endpoint that (a) streams, (b) takes a non-JSON body, (c) is slow / rate-limited / costs money, or (d) must not be reachable by function-name reflection.

**Trade-offs:** you re-implement the auth preamble per route (3 lines, already precedented) and you write a small typed client by hand instead of getting it from the barrel. In exchange you get streaming, multipart, per-route timeouts, and provider secrets that never touch the RPC surface.

**Example:**
```typescript
// src/app/api/agent/extract/route.ts
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60            // LLM latency; raise on Vercel plan limits

const ALLOWED: RoleLevel[] = ['ADMIN', 'BOSS', 'DISPATCHER', 'ZAMPORAB', 'HEAD']

export async function POST(req: NextRequest) {
  const auth = verifySessionToken(req.cookies.get('gormost_token')?.value)
  if (!auth) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
  if (!ALLOWED.includes(auth.role_level))
    return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 })

  const { text, planDate } = await req.json() as { text: string; planDate: string }
  const cfg = resolveAgentConfig()
  const { drafts, parseLogId } = await extractPlan({ text, planDate, actor: auth.user_id }, cfg)
  return NextResponse.json({ data: { drafts, parseLogId } })
}
```

### Pattern 2: Thin adapter, thick orchestrator

**What:** `LlmAdapter.complete(req: LlmRequest): Promise<LlmResponse>` is the entire provider contract. `LlmRequest = { system: string; messages: {role,content}[]; temperature?; responseFormat?: 'json'; maxTokens? }`. Everything provider-independent — prompt assembly with KB context injection, few-shot from `agent_corrections`, JSON parsing, schema validation, the "every object/service/work must resolve against KB or the row is `needs_review`" rule, confidence scoring, `agent_parse_log` write — happens in `extract/index.ts` and its pure helpers.

**When to use:** always, for multi-provider layers. The moment guardrail or parsing logic leaks into an adapter, every new adapter re-implements it and they drift.

**Trade-offs:** the normalized `LlmRequest` is a lowest-common-denominator — provider-specific features (Anthropic prompt caching, OpenAI structured-outputs schema, Yandex `reasoningOptions`) are either ignored or smuggled through an `opts` bag. Acceptable here: the task is "return JSON matching this shape," which every provider does.

**Example:**
```typescript
// src/lib/agent/extract/adapter.ts
export interface LlmAdapter {
  id: ProviderId
  complete(req: LlmRequest): Promise<LlmResponse>   // { text, usage?, modelConfidence? }
}

// src/lib/agent/index.ts
export function getExtractor(cfg = resolveAgentConfig()): LlmAdapter {
  switch (cfg.llm.provider) {
    case 'anthropic':  return anthropicAdapter(cfg.llm)
    case 'openai':     return openaiAdapter(cfg.llm)
    case 'yandexgpt':  return yandexAdapter(cfg.llm)
    case 'gigachat':   return gigachatAdapter(cfg.llm)
    case 'selfhosted': return selfhostedAdapter(cfg.llm)   // OpenAI-compatible
  }
}
```

### Pattern 3: Config resolution in one file, env is the source

**What:** `resolveAgentConfig()` reads `AGENT_LLM_PROVIDER`, `AGENT_LLM_MODEL`, `AGENT_LLM_BASE_URL`, `AGENT_LLM_API_KEY` (and STT equivalents, plus provider-specific `AGENT_YANDEX_FOLDER_ID`, `AGENT_GIGACHAT_SCOPE`, …), returns a typed `AgentConfig` with sane defaults, and is the *only* place `process.env.AGENT_*` is read. Follows the existing `src/lib/supabase.ts` pattern (`?? fallback ?? fallback`).

**When to use:** any time "swap provider via env without code change" is a hard requirement, as stated in PROJECT.md.

**Trade-offs:** a bad env value fails at request time, not build time. Mitigate with a `validateAgentConfig()` called once and surfaced on an admin "AI status" strip.

**Example:**
```typescript
// src/lib/agent/config.ts
export interface AgentConfig {
  llm: { provider: ProviderId; model: string; baseUrl?: string; apiKey: string; extra: Record<string,string> }
  stt: { provider: SttProviderId; model?: string; apiKey: string; extra: Record<string,string> }
  thresholds: { autoAccept: number; review: number }   // e.g. 0.8 / 0.5
}
export function resolveAgentConfig(): AgentConfig {
  const provider = (process.env.AGENT_LLM_PROVIDER ?? 'anthropic') as ProviderId
  return {
    llm: {
      provider,
      model: process.env.AGENT_LLM_MODEL ?? DEFAULT_MODEL[provider],
      baseUrl: process.env.AGENT_LLM_BASE_URL,
      apiKey: process.env.AGENT_LLM_API_KEY ?? '',
      extra: {
        folderId: process.env.AGENT_YANDEX_FOLDER_ID ?? '',
        gigachatScope: process.env.AGENT_GIGACHAT_SCOPE ?? 'GIGACHAT_API_PERS',
      },
    },
    stt: { /* … AGENT_STT_* … */ } as AgentConfig['stt'],
    thresholds: {
      autoAccept: Number(process.env.AGENT_CONF_ACCEPT ?? 0.8),
      review:     Number(process.env.AGENT_CONF_REVIEW ?? 0.5),
    },
  }
}
```

### Pattern 4: Bridge catalog with soft foreign keys

**What:** the KB tables are the agent's own vocabulary. Where a KB row is known to correspond to a row in an existing catalog, a nullable text/uuid column records it (`kb_locations.journal_object_id`, `kb_locations.main_object_id`, `kb_work_types.main_work_type_id`, `kb_work_types.work_permit_type_id`). Nothing is enforced with a hard FK to the legacy trees (avoids coupling migrations and cascade surprises); the journal `object_id` FK on `daily_plan_items` is the only hard link, and it is satisfied by creating a `journal_objects` row on the fly — the pattern `JournalApp.resolveObjectId()` already uses.

**When to use:** when a new subsystem needs to *reference* established data without owning it or migrating it.

**Trade-offs:** referential integrity across the bridge is the app's job, not the DB's. Stale bridge columns are possible (a `journal_objects` row deleted out from under a `kb_locations` link). Acceptable at this scale; a nightly reconcile check can flag orphans.

### Pattern 5: Proposal -> review gate -> existing write path

**What:** the agent never writes `daily_plan_items` directly from the model output. It writes `agent_parse_log` (+ `agent_review_queue` rows for low-confidence drafts) and returns drafts to the client. The human accepts/edits in `DictationReview.tsx`, and only the accept action calls the *existing* `createDailyPlanItem()` — once per row, `published` omitted (defaults false).

**When to use:** always, for "agent proposes, human disposes" as PROJECT.md mandates ("человек проверяет и публикует").

**Trade-offs:** an extra click per dictation. That is the point.

---

## Data Flow

### Dictation -> drafts -> review -> daily_plan_items

```
[user dictates or pastes Russian free text in /journal or /dispatcher]
        │
        ├─ voice ─► MediaRecorder (webm/opus)  ──►  POST /api/agent/transcribe  (multipart)
        │                                              │  verifySessionToken + role
        │                                              │  getTranscriber(cfg).transcribe(bytes)
        │                                              ▼
        │                                           { text }
        │                                              │
        └─ paste ──────────────────────────────────────┤
                                                       ▼
                                POST /api/agent/extract  { text, planDate }
                                   │  verifySessionToken + role (ADMIN/BOSS/DISPATCHER/ZAMPORAB/HEAD)
                                   │
                                   ▼
                          src/lib/agent/extract/index.ts  extractPlan()
                                   │
                   ┌───────────────┼───────────────────────────────────┐
                   │ 1. buildKbIndex()  ← fetch kb_locations,           │
                   │      kb_work_types, kb_aliases  (Supabase)         │
                   │ 2. buildExtractPrompt(kbSlice, text, fewShot←      │
                   │      agent_corrections)                            │
                   │ 3. getExtractor(cfg).complete(LlmRequest)  ─► LLM  │
                   │ 4. parseModelJson(raw) -> PlanDraft[]              │
                   │ 5. validateDrafts(drafts, kbIndex)   [guardrails]  │
                   │      · object not KB-resolvable  -> reviewStatus   │
                   │      · service not in 5 services -> drop/flag      │
                   │      · crew counts clamped to sane range           │
                   │      · one dictation split across services kept    │
                   │ 6. scoreDraft() -> confidence 0..1                 │
                   │ 7. recordParse() -> agent_parse_log (PROPOSED)     │
                   │    + agent_review_queue rows for conf < review     │
                   └───────────────┬───────────────────────────────────┘
                                   ▼
                    { drafts: PlanDraft[], parseLogId }
                                   │
                                   ▼
               DictationReview.tsx  (editable grid, N rows)
                 · per row: object | service | work | period | workers/foremen/itr/vehicles
                 · confidence chip · исходная фраза shown · edit / delete / reassign service
                                   │
                 ┌─────────────────┴─────────────────────────┐
                 │ human edits a field ≠ model value          │
                 │   -> POST /api/agent/correction            │
                 │        -> agent_corrections row            │
                 │   -> optional "запомнить синоним"          │
                 │        -> /api/db createKbAlias            │
                 └─────────────────┬─────────────────────────┘
                                   ▼
              "Создать черновики"  — for each accepted draft:
                 objectId = kbLocation.journal_object_id
                          ?? fuzzyMatch(objects, norm(draft.objectRef))
                          ?? await createJournalObject({ name, category_id:'OTHER', … })
                 await createDailyPlanItem({
                   plan_date: planDate, shift_type: draft.period,
                   object_id: objectId, service_id: draft.serviceId,
                   work_text: draft.workText,
                   required_workers/foremen/itr/vehicles, specialties,
                   created_by: session.user_id            // NO `published` -> defaults false
                 })
                                   │
                                   ▼
              await reload()   (useLoadData) — rows appear in the journal as ordinary
              unpublished draft rows. Manual "📢 Опубликовать смену" unchanged.
              PATCH agent_parse_log.outcome = 'COMMITTED' (or 'DISCARDED')
```

### xls training flow (ADMIN)

```
[ADMIN uploads Титул / Конструктив / Годовой план .xlsx in /admin KbTrainingTab]
        │
        ▼
POST /api/agent/ingest  (multipart)   verifySessionToken + role==='ADMIN'
        │  parseWorkbook(bytes)  [SheetJS]  -> RawRow[]   + sheetKind detection
        │  classify(row)  -> ParsedRow { entityType, canonicalName, serviceGuess, unit, area }
        │  insert kb_ingest_batches (STAGED) + kb_ingest_rows (decision=PENDING, diff vs existing)
        ▼
   { batchId, rowCount }
        │
        ▼
KbTrainingTab: staging table with per-row diff preview (CREATE / MERGE / SKIP)
        │  ADMIN adjusts decisions
        ▼
POST /api/db applyKbIngestBatch(batchId)   (plain CRUD, dispatcher is fine here)
        │  for each row: write kb_locations / kb_constructions / kb_work_types
        │  stamp kb_ingest_rows.decision + applied_at + target_id
        │  kb_ingest_batches.status = APPLIED | PARTIALLY_APPLIED
        ▼
KB populated. Aliases seeded from a synonyms column if present; more added in KbAliasTab.
```

### State management (client)

Unchanged pattern: every panel page stays a thin orchestrator; `DictationReview` holds its own local draft-array state; commit calls `reload()` from `useLoadData`, never raw `loadData`. Errors surface through the existing `guard()` / `useConfirm()` mechanism already in `JournalApp`.

---

## New vs Modified — Database

All new tables get, **in the same migration that creates them**:
```sql
ALTER TABLE <t> ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS anon_all_<t> ON <t>;
CREATE POLICY anon_all_<t> ON <t> FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
```
(Migration `050_journal_rls_policies.sql` is the cautionary tale: RLS on + zero policies = silent denial. Auth is enforced at the API layer via `verifySessionToken` + role checks, not RLS — consistent with the whole schema.)

### New tables

| Table | Purpose | Key columns | Notes |
|-------|---------|-------------|-------|
| `kb_locations` | Canonical участок objects from Титул | `id uuid pk`, `canonical_name text`, `inv_no text`, `address text`, `area_m2 numeric`, `category_id text ref journal_object_categories`, **`journal_object_id uuid null`**, **`main_object_id text null`**, `created_by`, timestamps | bridge cols nullable, no hard FK to legacy `objects` |
| `kb_constructions` | Конструктивные элементы from Конструктив | `id uuid pk`, `kb_location_id uuid ref kb_locations`, `name text`, `finish_type text`, `area_m2 numeric`, `unit text`, **`main_construction_id text null`** | |
| `kb_work_types` | Vocabulary of work phrasings + **service mapping** | `id uuid pk`, `canonical_name text`, **`service_id text ref services`**, `unit text`, `typical_period text check (DAY|NIGHT|AROUND)`, `typical_workers/foremen/itr/vehicles smallint`, `typical_specialties jsonb`, **`main_work_type_id text null`**, **`work_permit_type_id text null ref work_permit_types`** | the `service_id` column is the core "чья служба" value |
| `kb_aliases` | Synonyms / abbreviations | `id uuid pk`, `alias_norm text` (normalized via same `norm()` rule), `entity_type text check (location|construction|work_type|service)`, `entity_id text`, `weight smallint default 100`, `source text check (seed|manual|learned)`, `created_by`, `created_at`; `unique(alias_norm, entity_type)` | "борт. камень"="БК", "ЭВ №3"="аварийный выход 3" |
| `kb_ingest_batches` | One row per uploaded workbook | `id uuid pk`, `filename text`, `sheet_kind text check (TITUL|KONSTRUKTIV|GODOVOI|UNKNOWN)`, `uploaded_by text`, `status text check (STAGED|PARTIALLY_APPLIED|APPLIED|DISCARDED)`, `row_count int`, `created_at` | |
| `kb_ingest_rows` | Staging rows for diff preview | `id uuid pk`, `batch_id uuid ref kb_ingest_batches on delete cascade`, `raw jsonb`, `parsed jsonb`, `target_table text`, `target_id text null`, `decision text check (PENDING|CREATE|MERGE|SKIP)`, `confidence numeric`, `diff jsonb`, `applied_at timestamptz null` | |
| `agent_parse_log` | Every dictation / extraction | `id uuid pk`, `source text check (VOICE|PASTE)`, `input_text text`, `transcript_raw text null`, `provider text`, `model text`, `raw_output text`, `drafts jsonb`, `latency_ms int`, `token_cost jsonb null`, `plan_date date`, `outcome text check (PROPOSED|COMMITTED|DISCARDED)`, `created_by text`, `created_at` | audit + few-shot corpus |
| `agent_corrections` | Learn-from-correction | `id uuid pk`, `parse_log_id uuid ref agent_parse_log`, `draft_index smallint`, `field text`, `model_value text`, `human_value text`, `source_phrase text`, `created_by`, `created_at` | feeds few-shot + alias proposals |
| `agent_review_queue` | Low-confidence items needing a human | `id uuid pk`, `parse_log_id uuid ref agent_parse_log`, `draft_index smallint`, `reason text`, `status text check (OPEN|RESOLVED|DISMISSED)`, `resolved_by text null`, `resolved_at timestamptz null`, `created_at` | lightweight table (not a view) so items have their own lifecycle |

Suggested migration split: `053_agent_kb_catalog.sql` (kb_locations, kb_constructions, kb_work_types, kb_aliases), `054_agent_ingest_staging.sql` (kb_ingest_batches, kb_ingest_rows), `055_agent_parse_log.sql` (agent_parse_log, agent_corrections, agent_review_queue). Each self-contained with rollback + `anon_all_*`.

### Modified tables

| Table | Change | Migration notes |
|-------|--------|-----------------|
| `daily_plan_items` | OPTIONAL: add `source text not null default 'MANUAL'` (`MANUAL`\|`AGENT`) and `parse_log_id uuid null` for traceability | `ALTER TABLE` only; the existing `anon_all_daily_plan_items` policy (`FOR ALL`) already covers new columns — no new policy needed. Default keeps all existing rows and the manual flow untouched. |
| none else | The three existing catalogs, `work_plans`, `requests` are **not touched** | Explicit non-goal for v3.0 |

---

## Integration Points

### External Services

| Service | Integration pattern | Notes / gotchas |
|---------|--------------------|-----------------|
| Anthropic Messages API | `fetch` in `extract/adapters/anthropic.ts`; `x-api-key` + `anthropic-version` headers; ask for JSON in the prompt | No SDK dependency needed. Strongest Russian free-text extraction of the set. Prompt caching available if KB context is large. |
| OpenAI Chat Completions | `fetch`; `Authorization: Bearer`; `response_format:{type:'json_object'}` | Also the template for any OpenAI-compatible self-hosted model (vLLM, LM Studio) — just change `baseUrl`. |
| YandexGPT (`llm.api.cloud.yandex.net`) | `fetch`; `Authorization: Api-Key <key>` or IAM token; requires `folderId` in the model URI (`gpt://<folder>/yandexgpt/latest`) | Data-residency-friendly for a Russian gov entity. No official JS SDK — raw REST. |
| GigaChat (Sber) | `fetch`; OAuth2 client-credentials token exchange first (`scope=GIGACHAT_API_PERS`), then `Bearer`; Russian TLS root cert may be needed on the server | Most friction of the five (token lifecycle + certs). Isolate all of it in `gigachat.ts`. |
| Self-hosted LLM | OpenAI-compatible `baseUrl` via `selfhosted.ts` | Zero cost, full data control; quality depends on the model. |
| OpenAI Whisper / self-hosted Whisper | `POST` audio bytes multipart to `/audio/transcriptions` | Handles Russian well. Self-hosted `faster-whisper` behind an OpenAI-compatible shim reuses the same adapter. |
| Yandex SpeechKit STT | `fetch`; OGG/Opus or LPCM; `folderId`; short-audio vs async long-audio endpoints | Best Russian STT accuracy; same data-residency argument. |
| Browser MediaRecorder | Client-only, no dependency; record `audio/webm;codecs=opus`, POST blob to `/api/agent/transcribe` | Safari needs `audio/mp4` fallback; keep clips short (<2 min) for the sync STT endpoint. |
| SheetJS (`xlsx`) | `parseWorkbook()` in `ingest/workbook.ts` | **New dependency — requires user sign-off** per CLAUDE.md "don't install new major dependencies without asking". Alternative: ask ADMIN to save-as-CSV and parse with a hand-rolled splitter (brittle for merged cells). Recommend SheetJS. |

### Internal Boundaries

| Boundary | Communication | Considerations |
|----------|---------------|----------------|
| `DictationReview.tsx` ↔ `/api/agent/extract` | `agent-client.ts` `fetch` (JSON; SSE in a later polish) | mirror `api-client.ts` 401 -> `/login` redirect |
| `DictationReview.tsx` ↔ `daily_plan_items` | via existing `createDailyPlanItem` in `api-client.ts` (dispatcher) | no new write path; `published` never set by the agent |
| `/api/agent/*` ↔ `src/lib/agent/` | direct import (same server process) | `agent/` is `import 'server-only'` like `supabase.ts` |
| `src/lib/agent/` ↔ Supabase | reuse the exported `supabase` client from `src/lib/supabase.ts` | KB reads for guardrails; `agent_parse_log` writes |
| `KbTrainingTab.tsx` ↔ `knowledge.ts` (apply) | via `/api/db` dispatcher (`applyKbIngestBatch`) | plain CRUD -> dispatcher is the right call here |
| `extract/index.ts` ↔ adapters | only through `getExtractor()` factory | orchestrator never imports a concrete adapter |
| `agent_corrections` ↔ `extract/prompt.ts` | few-shot examples pulled at prompt-build time | cap count; most-recent-N or per-entity |

---

## Anti-Patterns

### Anti-Pattern 1: Adding `extractPlan` / `transcribe` to a `src/lib/api/` module

**What people do:** put the LLM call in `src/lib/api/agent.ts` and re-export from `api.ts` so the client can call it through `/api/db` like everything else.
**Why it's wrong:** the dispatcher does `func(...args)` then `NextResponse.json(...)` — no streaming, no multipart (audio would be base64 in a JSON array, hitting body limits), and every exported name is callable by any session holder, so a raw provider call becomes a reachable RPC. It also inherits no per-call timeout control.
**Do this instead:** `/api/agent/*` route group with its own auth preamble (the `/api/timesheet/export` precedent). Keep only KB CRUD on the dispatcher.

### Anti-Pattern 2: Reconciling the three catalogs in this milestone

**What people do:** try to merge `objects/constructions/work_types`, `journal_objects`, and `work_permit_types` into one tree so the agent has a single source.
**Why it's wrong:** the main tree feeds live `requests`; the journal is *deliberately* decoupled from the `work_plans` funnel; work-permit is a separate curated axis. A merge is a migration touching production data paths and is its own milestone of risk.
**Do this instead:** a fourth `kb_*` catalog with nullable bridge columns. Emit `daily_plan_items` against `journal_objects`, creating them on the fly exactly as the journal already does.

### Anti-Pattern 3: Writing model output straight into `daily_plan_items`

**What people do:** `/api/agent/extract` inserts rows itself and returns "done".
**Why it's wrong:** violates "агент только предлагает" (PROJECT.md); no human gate; a hallucinated object silently becomes a plan row; and if it also set `published` it would leak into other panels.
**Do this instead:** persist to `agent_parse_log`, return drafts, let `DictationReview` drive `createDailyPlanItem` per accepted row with `published` unset.

### Anti-Pattern 4: Provider `if`s scattered through extraction logic

**What people do:** `if (provider === 'anthropic') { headers X } else if (provider === 'yandex') { body Y }` inside `extractPlan`.
**Why it's wrong:** adding a provider means editing the orchestrator; guardrail/parse logic gets entangled with transport; testing needs live keys.
**Do this instead:** the only `switch(provider)` is `getExtractor()`. Orchestrator sees `LlmAdapter`. Adapters are unit-testable with a recorded HTTP fixture.

### Anti-Pattern 5: Guardrails or confidence inside the adapter

**What people do:** each adapter validates the JSON and scores confidence its own way.
**Why it's wrong:** N implementations that drift; the "no invented entities" rule ends up enforced for Anthropic but not YandexGPT.
**Do this instead:** `parse.ts` + `guardrails.ts` + `confidence.ts` are provider-agnostic pure functions the orchestrator calls after `adapter.complete()`.

### Anti-Pattern 6: RLS enabled, `anon_all_*` policy forgotten

**What people do:** `CREATE TABLE` + `ENABLE ROW LEVEL SECURITY` in one migration, policy "later".
**Why it's wrong:** the server client uses the anon key; RLS on + no policy = every read/write silently denied (migration 050 fixed exactly this for the journal).
**Do this instead:** policy in the same migration, every time. Add it to the phase-8 checklist.

### Anti-Pattern 7: Trusting the model to emit entity IDs

**What people do:** prompt asks for `journal_object_id` / `service_id` directly and the code inserts them.
**Why it's wrong:** the model will confidently invent UUIDs and plausible-looking service codes.
**Do this instead:** the model emits *names / phrases*; server-side `buildKbIndex()` + alias lookup + fuzzy `norm()` match resolves them to IDs, and anything unresolved becomes `reviewStatus: needs_review`.

### Anti-Pattern 8: Provider keys in `NEXT_PUBLIC_*`

**What people do:** reuse the `NEXT_PUBLIC_` convention out of habit.
**Why it's wrong:** ships the key to the browser bundle.
**Do this instead:** `AGENT_LLM_API_KEY` etc. are server-only; read only in `config.ts`; `src/lib/agent/` is `import 'server-only'`.

---

## Scaling Considerations

This is a ~50-100 user internal tool; request concurrency is not the constraint. The real limits:

| Concern | 0-100 users (now) | If usage grows |
|---------|-------------------|----------------|
| LLM latency (5-20 s / dictation) | `maxDuration=60`, show a progress spinner; SSE streaming as phase-11+ polish | queue + poll if a plan spawns many extractions |
| LLM cost / rate limits | one extraction per dictation; cache `buildKbIndex()` per request; keep KB context trimmed to the relevant categories | per-user daily cap; cheaper model for the classify step |
| STT clip length | cap browser recording at ~2 min, use the provider's short-audio endpoint | switch to async long-audio endpoint + polling |
| `agent_parse_log` / `agent_corrections` growth | fine for years at this volume | periodic archive; index on `created_at`, `outcome` |
| xls ingest | ADMIN-only, infrequent, staged | batch size guard; stream-parse very large sheets |
| KB size for guardrail lookups | load all `kb_*` into memory maps per request | move fuzzy matching to a Postgres `pg_trgm` index; cache the index in module scope with TTL |

### Scaling priorities

1. **First bottleneck:** perceived latency of a single extraction — fix with streaming/progress UI, not infra.
2. **Second bottleneck:** LLM spend if dictation becomes the default entry path — fix with KB-context trimming and a two-tier model (cheap classify, capable extract).

---

## Build Order — Phases (continuing from Phase 8)

Dependency rule: **KB schema + ingest before extraction; adapter before agent UI; text before voice.**

### Phase 8 — Knowledge-base schema + RLS + CRUD
- Migrations `053`/`054`/`055`: all `kb_*` and `agent_*` tables, each with `anon_all_<table>` policy + rollback.
- `src/lib/api/knowledge.ts` — CRUD mirroring `journal.ts` style; `export * from './api/knowledge'` in `api.ts`; manual wrappers in `api-client.ts`.
- `src/types/index.ts` — all new interfaces.
- Pure helper `resolveEntity(text, kbIndex)` + `norm()` reuse — **TDD, tests first** (CLAUDE.md rule).
- Minimal `/admin` list views (read-only) to eyeball seeded data.
- **Exit:** tables live in Supabase, CRUD reachable, `npm run build` + `npm run test` green.
- **Depends on:** nothing.

### Phase 9 — xls ingest / training tool (ADMIN)
- **Dependency decision up front:** add SheetJS (`xlsx`) — get user sign-off.
- `POST /api/agent/ingest` (multipart) -> `ingest/workbook.ts` + `ingest/classify.ts` -> `kb_ingest_batches` / `kb_ingest_rows`.
- `applyKbIngestBatch()` in `knowledge.ts` (dispatcher path) -> writes `kb_*`, stamps rows.
- `src/components/admin/KbTrainingTab.tsx` (upload -> staging -> diff preview -> apply), `KbAliasTab.tsx` (alias CRUD).
- Seed KB from Титул / Конструктив / Годовой план.
- **Exit:** a real workbook round-trips into `kb_*`; aliases editable.
- **Depends on:** Phase 8.

### Phase 10 — Provider-agnostic adapter layer + `extractPlan`
- `src/lib/agent/` — `config.ts`, `types.ts`, `extract/adapter.ts`, ≥2 adapters (Anthropic + one OpenAI-compatible/self-hosted), `extract/prompt.ts`, `extract/parse.ts`, `guardrails.ts`, `confidence.ts`, `kb-index.ts`, `log.ts`.
- `POST /api/agent/extract` (JSON in/out; streaming deferred).
- Pure functions (`prompt`, `parse`, `guardrails`, `confidence`) — **TDD**.
- Recommend running the `gsd-ai-integration-phase` skill to produce an AI-SPEC.md design contract for this phase.
- **Exit:** pasted Russian text -> validated `PlanDraft[]` with confidence + `agent_parse_log` row; provider swap by env verified with a second adapter.
- **Depends on:** Phase 8 (KB for context + guardrails).

### Phase 11 — Dictation review UI (text path) + commit to drafts
- `src/lib/agent-client.ts`.
- `src/components/journal/DictationReview.tsx` (editable grid, confidence chips, source phrase, per-row accept/edit/reassign).
- `JournalApp.tsx` — "🎤 Надиктовать план" button + modal mount (~15 lines, 1 import).
- `src/components/dispatcher/DictationEntry.tsx` — same entry on `/dispatcher`.
- Commit loop -> `createDailyPlanItem` (unpublished); `POST /api/agent/correction` -> `agent_corrections`; "запомнить синоним" -> `createKbAlias`.
- Flip `agent_parse_log.outcome`.
- **Exit:** paste a multi-service dictation -> review -> "Создать черновики" -> unpublished rows appear in the journal; manual publish still works; `work_plans` untouched.
- **Depends on:** Phase 10.

### Phase 12 — Voice capture + STT
- Browser `MediaRecorder` capture component.
- `POST /api/agent/transcribe` (multipart) -> `SttAdapter` (Whisper + Yandex SpeechKit).
- Feeds the same Phase 11 review flow (transcript -> extract).
- **Exit:** record in browser -> transcript -> drafts -> review.
- **Depends on:** Phase 11.

### Phase 13 (optional polish) — Learn-from-correction loop + low-confidence queue
- Few-shot injection from `agent_corrections` into `extract/prompt.ts`.
- `src/components/admin/KbReviewQueueTab.tsx` over `agent_review_queue`.
- Auto-propose `kb_aliases` from repeated corrections; SSE streaming on `/api/agent/extract`; extraction metrics on the admin AI-status strip.
- **Depends on:** Phases 11-12.

---

## Sources

- Codebase (read 2026-09-01): `src/app/api/db/route.ts`, `src/app/api/timesheet/export/route.ts`, `src/lib/api.ts`, `src/lib/api/journal.ts`, `src/lib/api/catalog.ts`, `src/lib/api-client.ts`, `src/lib/supabase.ts`, `src/lib/logger.ts`, `src/components/journal/JournalApp.tsx`, `src/components/journal/data.ts`, `src/types/index.ts`, `supabase/migrations/042_journal_daily_plans.sql`, `043_work_permit_catalog.sql`, `050_journal_rls_policies.sql`, `052_urgent_orders.sql`
- `CLAUDE.md`, `.planning/PROJECT.md` (v3.0 milestone section)
- Provider REST-API shapes (Anthropic Messages, OpenAI Chat Completions / Audio, YandexGPT, GigaChat, Yandex SpeechKit) — general knowledge, MEDIUM confidence, verify exact endpoints/headers at implementation time in Phase 10/12

---
*Architecture research for: AI work-dispatcher integration into an existing Next.js 16 / Supabase app*
*Researched: 2026-09-01*
