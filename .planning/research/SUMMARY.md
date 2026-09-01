# Project Research Summary

**Project:** Gormost - v3.0 "Planirovshchik-agent" (AI work-dispatcher)
**Domain:** LLM structured-extraction + Russian STT + legacy-spreadsheet ingest, bolted onto an existing Next.js 16 / Supabase / Vercel operations app
**Researched:** 2026-09-01
**Confidence:** MEDIUM

## Executive Summary

v3.0 adds an AI layer to Gormost that turns a dictated or pasted Russian free-text briefing into structured day-plan draft rows ({obyekt, sluzhba, rabota, period, lyudi, tekhnika, uverennost, iskhodnaya fraza}), grouped by service, which a human reviews and publishes. It also adds a permanent ADMIN "training tool" that seeds a knowledge base (KB) of the uchastok vocabulary - objects, constructions, work types with service binding, and a synonym/alias table - from the Titul / Konstruktiv / Godovoi plan Excel files. This is a well-understood composite of three established product classes: NL->structured-rows extraction with human review, a spreadsheet import wizard with staging/diff/partial-accept, and RAG-style grounding against a controlled vocabulary with corrections fed back as labeled data. None of it is novel research; the risk is entirely in integration discipline and Russian-domain specifics.

The recommended approach is resolve, don't generate: the LLM only segments text into work-lines with verbatim source phrases; a deterministic server-side resolver (alias table + Russian-normalized fuzzy match) maps each field to a real catalog ID or null - never an invented name. The AI layer is a thin provider-agnostic boundary (two interfaces, extractPlan / transcribe, one adapter file per backend, provider chosen by env) with all guardrails - grounding whitelist, confidence thresholds, prompt-injection boundary, immutable parse log - living above the adapter so they are provider-independent. Structured output is prompt-instructed JSON + Zod safeParse + one repair retry, uniformly across all providers - do NOT rely on generateObject / provider-native constrained decoding, which is inconsistent across the 4 heterogeneous backends (Anthropic, OpenAI, YandexGPT/GigaChat, self-hosted). The agent's only write sink is unpublished daily_plan_items behind an explicit human "Sozdat chernoviki" click; it never touches requests, work_plans, statuses, or publishing.

Top risks and mitigations: (1) hallucinated entities reaching daily_plan_items -> two-stage resolve-don't-generate + write guard that refuses rows with unresolved required fields; (2) uncalibrated model self-confidence wired to a queue threshold -> compute a separate trustworthy resolution confidence from match strength, treat the model's number as a weak signal, calibrate against a golden set; (3) Vercel serverless timeout - LLM/STT calls must NOT run through the existing /api/db RPC dispatcher; give them dedicated /api/agent/* routes with explicit maxDuration and streaming; (4) cost blow-up on a shared-PIN public demo URL -> ROLE_RESTRICTED gating, per-user rate limit, input caps, max_tokens, per-call cost logging; (5) messy real-world .xls (merged cells, "kopiya" duplicates, 2012-era templates, header drift) -> mandatory staging + diff-preview, fuzzy header mapping with loud failure, merged-cell forward-fill, dedup on a normalized+lemmatized key; (6) Russian morphology in matching -> a shared normalization + lemmatization pipeline applied identically to catalog, aliases, dictation, and Excel cells, with the alias table as the primary mechanism.

## Key Findings

### Recommended Stack

See STACK.md. Own a thin AiProvider interface (~150 LOC, no agent framework) with one adapter per backend. Use the Vercel AI SDK v5 (pinned exactly, confined to adapter files) for the Anthropic / OpenAI / OpenAI-compatible transports; raw fetch adapters for YandexGPT and GigaChat. Every new route is runtime = 'nodejs', never Edge. Audio and Excel never transit a Vercel function body (4.5 MB cap) - browser uploads to Supabase Storage via signed URL, the function reads server-side.

**Core technologies:**
- Vercel AI SDK v5 (ai@5 pinned, @ai-sdk/anthropic@4, @ai-sdk/openai@4, @ai-sdk/openai-compatible@3) - unified LLM transport inside adapters only - industry-standard, but major line churned 3x in a year so pin and isolate.
- Zod 4 (zod@4) - PlanRow[] extraction schema + z.toJSONSchema() + output safeParse - the enforcement point of the "never invent entities" guardrail; JSON-Schema gen is built in.
- SheetJS xlsx 0.20.3 from the SheetJS CDN tarball (NOT npm xlsx@0.18.5, 4 years stale with unpatched CVEs) - only mature JS lib that reads legacy .xls (BIFF) + .xlsx through one API - server-only, Node runtime. New dependency - needs user sign-off per CLAUDE.md.
- Default LLM: Anthropic claude-haiku-4-5 for extraction, auto-escalate low-confidence re-parses to claude-sonnet-5 - strong Russian instruction-following, 200K context fits the catalog, cheapest Anthropic tier; prompt-cache the catalog prefix.
- Default STT: Groq whisper-large-v3-turbo for dev/demo - cheapest, ~200x realtime, trivial REST.
- Sovereignty profile: AI_LLM_PROVIDER=yandexgpt (or selfhosted) + AI_STT_PROVIDER=yandex-speechkit (or selfhosted-whisper) - swappable by env with zero code change; both Yandex services offer on-prem/hybrid deployment.
- Postgres pg_trgm (Supabase migration, no npm dep) - fuzzy alias/synonym matching for the small controlled vocabulary; no vector DB / embeddings.
- Native MediaRecorder (audio/webm;codecs=opus) - browser capture, no library, no transcode.

**Structured-output decision (firm):** every adapter calls generateText (or raw completion) with a JSON-only instruction + few-shot; the guardrail layer does JSON.parse -> PlanRow[].safeParse -> one repair round-trip. Identical behaviour and test surface across all 5 backends. This is the single most important architectural call in the milestone. Only revisit if the Yandex/GigaChat/self-hosted requirement is dropped entirely.

### Expected Features

See FEATURES.md.

**Must have (table stakes, v1):**
- KB schema: alias/synonym table + work-type attribution columns (service_id, unit, typical_period, typical_crew) - nothing else works without it.
- Excel ingest pipeline for Titul / Konstruktiv / Godovoi plan: upload -> preset column-map -> staging -> diff/preview (new / changed / duplicate) -> checkbox partial accept -> commit.
- Alias manager CRUD (ADMIN) with search, source display, one-surface-two-canonicals collision warning.
- Provider-independent AI layer: extractPlan() + transcribe(), >=1 working adapter each, guardrails module (entity whitelist, two configurable confidence thresholds, parse-log tables, max-rows cap, timeout -> manual-modal fallback).
- Text-paste extraction -> rows with per-field green/yellow/red chips + iskhodnaya fraza always shown; sorted worst-confidence-first.
- KB grounding (exact alias + fuzzy match, never-invent rule).
- Editable preview reusing the existing journal "Novaya zapis plana" widgets; per-row accept/reject; bulk-accept greens; multi-service grouping (override allowed); multi-item split.
- "Sozdat chernoviki" -> unpublished daily_plan_items for a chosen date + shift; agent never publishes.
- "Zapomnit ispravlenie" -> red->picked / create-new becomes an alias row; every preview edit logged.
- Entry points: "Nadiktovat plan" in /journal (BOSS/ADMIN) and /dispatcher (DISPATCHER/BOSS/ADMIN), gated via ROLE_RESTRICTED.
- Voice path: record -> transcribe -> editable transcript -> same extraction. P1 but the only safely cuttable item to v1.x if the STT adapter slips.

**Should have (competitive, v1.x):**
- Low-confidence review queue with one-click curate (create alias / create catalog entry / dismiss).
- Ingest conflict detection (inv.# / name+parent collisions vs live catalog).
- Ambiguity picker with disambiguating context for yellow fields.
- Inline "create new catalog entry" from the plan preview (provisional flag -> queue).
- Row merge + drag-to-split UI; parse-session history / undo.
- Second LLM + STT adapter wired up to prove the abstraction.

**Defer (v2+):**
- Voice entity-add in the training tool (needs a command grammar).
- Scope-aware alias resolution across LTR/GTR/TTK/ZB.
- Few-shot self-improvement from curated corrections; KB-health dashboard; confidence-threshold auto-tuning; multi-turn conversational correction.

**Explicit anti-features:** annual plan-grafik scheduling, materials/norms, agent auto-creating requests/work_plans, normo-chasy/volume calculation, the full 59-section asset registry, auto-publish, custom NER fine-tuning, agent assigning workers by name, conversational chat agent, vector DB for retrieval.

### Architecture Approach

See ARCHITECTURE.md. Split by nature of the call: plain KB CRUD goes through the existing /api/db dispatcher as a new src/lib/api/knowledge.ts domain module (inherits auth + role gating for free); LLM/STT/ingest go in a new /api/agent/* route group that does its own verifySessionToken + role check (the /api/timesheet/export precedent) - because the dispatcher auto-exposes every exported name as a callable RPC and cannot stream or take multipart. The provider layer src/lib/agent/ sits beside src/lib/api/, is import 'server-only', and is deliberately kept out of the api.ts barrel. Adapters are dumb transport (LlmAdapter.complete(LlmRequest): Promise<LlmResponse>); the only switch(provider) is the adapter factory. Config resolves once from env in config.ts. Proposal -> review gate -> existing write path: the agent writes agent_parse_log (+ review-queue rows), returns drafts; only the human accept action calls the existing createDailyPlanItem() with published unset.

**Major components:**
1. /api/agent/{extract,transcribe,ingest,correction} - dedicated Node route handlers, own auth preamble, per-route maxDuration, streaming.
2. src/lib/agent/ - config.ts (env -> typed AgentConfig), extract/index.ts orchestrator (prompt build + KB-context injection + parse + guardrails + confidence + log), guardrails.ts / confidence.ts / parse.ts / prompt.ts (pure, TDD), extract/adapters/* + transcribe/adapters/* (one fetch per provider), ingest/workbook.ts + ingest/classify.ts (SheetJS).
3. src/lib/api/knowledge.ts - ordinary Supabase CRUD for the KB + staging + parse-log/corrections/queue tables, dispatched via /api/db; src/lib/agent-client.ts - typed browser wrappers for /api/agent/* (sibling of api-client.ts).
4. UI: src/components/journal/DictationReview.tsx (editable draft grid + commit loop, reuses journal widgets), dispatcher/DictationEntry.tsx, admin/{KbTrainingTab,KbAliasTab,KbReviewQueueTab}.tsx.
5. New DB tables with anon_all_<table> policy in the same migration: KB catalog, alias table, ingest staging (batches + rows), agent_parse_log, agent_corrections, agent_review_queue; optional source + parse_log_id columns on daily_plan_items.

### Critical Pitfalls

Top items from PITFALLS.md (12 total, plus debt/security/UX tables and a "Looks Done But Isn't" checklist):

1. Hallucinated / invented entities - two-stage resolve-don't-generate: LLM segments into spans with verbatim phrases, a deterministic resolver returns a catalog ID or null; constrain output to an enum of real IDs where the candidate set is small; unresolved rows are rendered explicitly as "ne raspoznano" and block "Sozdat chernoviki". Invented-entity rate must be 0 on the golden set.
2. Trusting the model's self-reported confidence - compute a trustworthy resolution confidence from match strength (exact alias hit > lemma overlap > trigram); treat the model's number as a weak signal; calibrate queue thresholds against measured per-bucket precision on a golden set; show the reviewer which field and which candidates, not just a float.
3. Prompt injection from dictated/pasted text - untrusted text in a separate message / fenced block with strict boundary phrasing; schema-locked output with ID enums (a successful injection can only set a wrong field value, caught in review); the agent-only-proposes invariant means one sink and no action path; input size cap; absurd-headcount post-check.
4. Provider lock-in leaking through the "provider-agnostic" abstraction - domain types in / domain types out, no SDK objects in signatures; design the schema to the intersection of provider constraints (flat, enums, no unions, no numeric bounds - validate bounds in code); build >=2 adapters + a mock/replay adapter before shipping; adapter owns retries, timeout, token->cost normalization, refusal->typed-error mapping.
5. Vercel serverless timeout / no streaming on /api/db - dedicated /api/agent/* routes with explicit maxDuration; stream extraction row-by-row; async job + poll for longer transcription; keep prompts + candidate lists small (per-service catalog subset). Verify which Vercel plan gormost.vercel.app is on - Hobby's ~10 s wall is a blocker.
6. Per-call cost blow-up + no rate limiting - add every AI/ingest function to ROLE_RESTRICTED (default-deny); server-side per-user token-bucket rate limit -> 429 before the provider call; input caps (chars / audio seconds); max_tokens on every call; batch Excel classification + cache by content hash; log {provider, model, promptVersion, tokens, costRub, userId} on every call; AI_MONTHLY_BUDGET_RUB kill-switch.
7. Messy real-world .xls ingest - staging + diff-preview mandatory; detect columns by fuzzy header match and fail loud on unknown layouts; forward-fill merged cells (!merges); dedup on a normalized+lemmatized key against existing catalog and within the batch; drop ITOGO/spacer rows by heuristic and show the skipped count; tolerant number parser for ploshchadi; don't trust inv.# as a key; keep file+row provenance on every staged entry.
8. Russian morphology / declension in matching and dedup - one normalization pipeline (yo->e, NBSP, #/N, dashes, lowercase, strip punctuation) applied identically to catalog, aliases, dictation, Excel cells; lemmatize RU tokens before matching (no verified JS lemmatization library found yet - Phase 10 spike); alias table is the primary mechanism, fuzzy match the fallback; build a fixture set of real variant->canonical pairs.
9. RLS / auth gaps for new tables and audio blobs - anon_all_<table> policy in the same migration as every new table; audio in a private Storage bucket, short-TTL server-minted signed URLs, delete after successful transcription (keep only transcript + hash); restrict parse-log read API to ADMIN/BOSS even with a permissive row policy.
10. No extraction eval / regression harness - versioned golden dataset (~30 real messy RU cases in Phase 8, growing to 100-300); field-level metrics (precision/recall per field, invented-entity rate, calibration curve); offline npm run eval against a mock/replay adapter, wired as a release gate (not per-commit); log promptVersion + model + provider on every parse; every correction becomes a new golden case.
11. Catalog fragmentation - a fourth overlapping reference-data store - see reconciliation note 1 below.
12. Scope creep into annual planning / materials / auto-creating zayavki - hard invariant in every phase's success criteria: the agent's only write sink is unpublished daily_plan_items; a test greps AI modules for forbidden requests/work_plans imports; ingest reads a column allow-list only.

## Reconciliation Notes (where the parallel researchers diverged)

### 1. Knowledge-base schema shape - bridge catalog vs enrichment layer

**The tension.** ARCHITECTURE.md proposes a new kb_* catalog (kb_locations, kb_constructions, kb_work_types, kb_aliases) - effectively a 4th reference-data store - with its own PKs and nullable bridge columns (journal_object_id, main_object_id, main_work_type_id, work_permit_type_id) pointing at the three existing catalogs, no hard FKs. Its argument: reconciling the three existing catalogs is its own milestone that would touch live requests; a clean new schema is faster and safer to build. PITFALLS.md (Pitfall 11) warns that a standalone 4th store means the agent resolves against entities that don't line up with what /journal actually writes - so "Sozdat chernoviki" either fails or creates orphans - and argues the KB should be an enrichment layer keyed to the journal catalog (journal_objects), because the agent's write sink is daily_plan_items which FKs to journal_objects.

**Recommended default for the roadmap:** treat the KB as an enrichment layer whose canonical object identity is the journal catalog, not a parallel entity tree. Concretely: kb_work_types and kb_aliases are genuinely new (there is no journal-side work vocabulary or alias table to extend), but KB locations should either be journal_objects rows with enrichment columns attached, or a kb_locations table whose journal_object_id is NOT NULL and populated at ingest time (create the journal_objects row during Excel ingest, exactly as JournalApp.resolveObjectId() already does on the fly). The resolver returns IDs that "Sozdat chernoviki" can use directly, and there is one place to add a new object.
**Trade-off:** this couples Phase 9 ingest to journal_objects creation and means the ingest tool must understand the journal catalog's shape (category_id, the resolveObjectId path) - slightly more integration work up front. The pure kb_* island is faster to stand up but pushes a hard reconciliation problem into Phase 11/13 where it surfaces as orphaned drafts. Pay the cost early. The catalog map (how objects/constructions/work_types, journal_objects, work_permit_catalog, and the new KB relate) must be written into ARCHITECTURE.md before Phase 9 coding - this reconciliation between the three existing catalogs is currently undocumented and is a shared open question.

### 2. Phase count / numbering

Numbering continues from v2.0 (last phase was 07), so v3.0 starts at Phase 8. The two researchers proposed slightly different decompositions:

- ARCHITECTURE.md (Phases 8-13): 8 KB schema+RLS+CRUD; 9 xls ingest/training tool; 10 provider-agnostic adapter + extractPlan; 11 dictation review UI (text) + commit; 12 voice capture + STT; 13 (optional) learn-from-correction + queue.
- PITFALLS.md (Phases 8-14): 8 AI provider abstraction + guardrails + parse log + eval skeleton; 9 KB schema + Excel staging/ingest; 10 alias table + RU entity resolver; 11 ADMIN training tool + low-confidence queue + learn-from-correction; 12 browser voice capture -> transcription; 13 agent dispatcher UI in /journal + /dispatcher; 14 eval calibration, regression gate, drift/cost monitoring.

The disagreement is mostly ordering (does the AI abstraction come before or after the KB schema?) and granularity (PITFALLS splits resolver, training tool, and eval-calibration into their own phases). Both agree on the dependency spine: KB + ingest before the resolver; the provider abstraction + >=2 adapters + mock before the agent UI; text path before voice; eval harness skeleton exists from the first AI phase. Final phase boundaries are the roadmapper's call. A reasonable synthesis is 7 phases (8-14): KB schema+CRUD -> Excel ingest/training tool -> AI abstraction + adapters + guardrails + eval skeleton -> RU resolver + alias table -> text extraction + dictation review UI + commit -> voice/STT -> eval calibration + cost/drift monitoring + learn-from-correction polish.

### 3. Structured output mechanism - firm recommendation

Do NOT use generateObject / provider-native constrained decoding. Standardize on prompt-instructed JSON + Zod safeParse + one repair retry, uniformly across every provider. Rationale: the 4 backends (Anthropic tool-use, OpenAI json_schema, YandexGPT/GigaChat function-calling with no union support, self-hosted via @ai-sdk/openai-compatible which has an open structured-output bug, vercel/ai #8427) each enforce structure differently and to different JSON-Schema subsets. A uniform prompt-JSON path gives identical behaviour and identical test surface everywhere, and keeps the extraction schema portable (design it to the intersection: flat, enums, no oneOf/unions, no numeric bounds - validate bounds in code). Carry this as a locked decision into Phase 8/10.

### 4. Default provider vs sovereignty path - open question

STACK.md default = Anthropic claude-haiku-4-5 (extract, escalating to claude-sonnet-5) + Groq whisper-large-v3-turbo (STT). Sovereignty profile = YandexGPT / Yandex SpeechKit v3 / self-hosted, swappable by env (AI_LLM_PROVIDER, AI_STT_PROVIDER) with zero code change. Open question for requirements/roadmap: which is the intended v1 default? Anthropic + Groq are the fastest path to a working demo but are geo-blocked / hard to pay for from Russia and store data outside RU; a Moscow city-government production deployment likely mandates the Yandex or self-hosted path. PITFALLS.md Pitfall 4 stresses the abstraction must tolerate "provider X simply not reachable in this deployment". The roadmap should force this decision early (Phase 8) because it changes which adapter is built and eval'd first, and the prompt must be re-tuned and re-eval'd per provider - Russian extraction quality differs. Recommended: build the Anthropic adapter and one RU adapter (YandexGPT or GigaChat) and the mock in Phase 8; pick the env default once the deployment constraint is confirmed.

### Shared open questions raised by all four researchers

- Exact daily_plan_items column list vs the journal migration SQL (042/051) - the agent fills a subset; confirm the precise column names/types and which are NOT NULL before Phase 11 wiring. Currently only inferred from CLAUDE.md.
- Which Vercel plan gormost.vercel.app is on - Hobby (~10 s) vs Pro (60 s default, up to 300 s classic / 800 s Fluid Compute). Is Fluid Compute enabled? Verify in Phase 8; "we're on Hobby" is a blocker for this feature as designed.
- No verified JS Russian lemmatization library - az/azes, lets-declension, Snowball/natural RU stemmer, or a pymorphy2-equivalent via a small serverless function are all candidates but none confirmed. Phase 10 spike; stemming-only is an acceptable fallback.
- Undocumented reconciliation between the three existing catalogs (objects/constructions/work_types admin tree, journal_objects, work_permit_catalog) - the seams are undocumented; write the catalog map into ARCHITECTURE.md before Phase 9.

## Implications for Roadmap

Suggested phase structure (v3.0 = Phases 8-14; boundaries are the roadmapper's call).

### Phase 8: Knowledge-base schema + RLS + CRUD
**Rationale:** KB schema is phase 1 of everything - the alias table + work-type attribution must exist before grounding, which must exist before extraction is useful. No external dependencies.
**Delivers:** migrations for the KB catalog / alias table / ingest staging / agent_parse_log / agent_corrections / agent_review_queue, each with anon_all_<table> policy + rollback in the same migration; src/lib/api/knowledge.ts CRUD (dispatched via /api/db, added to ROLE_RESTRICTED ADMIN-only for mutations); new types in src/types/index.ts; pure resolveEntity(text, kbIndex) + norm() helper (TDD, tests first); read-only /admin list views.
**Addresses:** KB schema (table stakes); alias manager backbone.
**Avoids:** Pitfall 9 (RLS policy in the creating migration), Pitfall 11 (schema decided as enrichment keyed to journal_objects - see reconciliation note 1), Pitfall 12 (no normo_hours/monthly_target columns).

### Phase 9: Excel ingest / training tool (ADMIN)
**Rationale:** KB is empty without it; independent of the extraction pipeline so it can proceed in parallel with Phase 10 once the schema lands.
**Delivers:** POST /api/agent/ingest (multipart) -> SheetJS parse + sheet-kind detection + row classification -> kb_ingest_batches / kb_ingest_rows staging with per-row diff; applyKbIngestBatch() via /api/db; KbTrainingTab.tsx (upload -> column-map -> staging -> 3-way diff preview -> checkbox partial accept -> commit) + KbAliasTab.tsx; KB seeded from real Titul / Konstruktiv / Godovoi plan.
**Uses:** SheetJS xlsx 0.20.3 CDN tarball (get user sign-off first - new major dependency).
**Avoids:** Pitfall 7 (staging + diff mandatory, fuzzy header mapping with loud failure, merged-cell forward-fill, dedup on normalized key, drop spacer rows, file/row provenance), Pitfall 8 (shared normalization pipeline), Pitfall 6 (batch classification + cache by content hash).

### Phase 10: Provider-agnostic AI layer + extractPlan + eval skeleton
**Rationale:** the adapter interface must be exercised by >=2 shapes before any UI depends on it; the eval harness must exist from the first AI phase so quality is measurable.
**Delivers:** src/lib/agent/ - config.ts, types.ts, extract/adapter.ts + >=2 adapters (Anthropic + one RU/OpenAI-compatible) + a mock/replay adapter, extract/prompt.ts / parse.ts / guardrails.ts / confidence.ts / kb-index.ts / log.ts (pure fns, TDD); POST /api/agent/extract (dedicated Node route, maxDuration, JSON in/out, streaming contract); Russian normalization + lemmatization resolver (spike a JS lemmatizer; stemming fallback) + scoring producing resolution confidence; npm run eval offline against the mock with ~30 real messy RU golden cases + per-field metrics. Run gsd-ai-integration-phase to produce an AI-SPEC.md.
**Uses:** Vercel AI SDK v5 (pinned, adapter-only), Zod 4, prompt-JSON + safeParse + one repair retry (see reconciliation note 3).
**Avoids:** Pitfall 1 (resolve-don't-generate, ID enums, null for unmatched), Pitfall 2 (two confidences, log both), Pitfall 3 (message boundary, schema lock, input cap), Pitfall 4 (domain types in/out, intersection schema, >=2 adapters + mock), Pitfall 5 (dedicated route + maxDuration + streaming), Pitfall 6 (ROLE_RESTRICTED, max_tokens, per-call cost logging, input caps), Pitfall 10 (eval skeleton + mock adapter).

### Phase 11: Dictation review UI (text path) + commit to drafts
**Rationale:** depends on Phase 10's extractPlan; delivers the headline capability minus voice.
**Delivers:** src/lib/agent-client.ts; DictationReview.tsx (editable grid reusing journal "Novaya zapis plana" widgets, per-field green/yellow/red chips, iskhodnaya fraza always shown, worst-first sort, accept/reject/bulk-accept-greens/split/merge/reassign-service); "Nadiktovat plan" entry in JournalApp.tsx (~15 lines) and dispatcher/DictationEntry.tsx; commit loop -> createDailyPlanItem (unpublished); POST /api/agent/correction -> agent_corrections; "zapomnit ispravlenie" -> createKbAlias; flip agent_parse_log.outcome.
**Addresses:** editable preview, multi-service grouping, multi-item split, "Sozdat chernoviki", "Zapomnit ispravlenie" (all table stakes).
**Avoids:** Pitfall 1 (write guard refuses unresolved required fields), Pitfall 12 (only sink is unpublished daily_plan_items; forbidden-import test), UX pitfalls (show why a row is uncertain, render unresolved rows explicitly, stream progress, per-service groups).

### Phase 12: Voice capture + STT
**Rationale:** thin front-end on the Phase 11 text pipeline; cuttable to v1.x if the STT adapter slips.
**Delivers:** browser MediaRecorder component; POST /api/agent/transcribe (multipart, dedicated route) -> SttAdapter (Groq/Whisper + Yandex SpeechKit); private Storage bucket + short-TTL signed URLs + delete-after-transcription; editable transcript before extraction; feeds the Phase 11 review flow.
**Uses:** native MediaRecorder, Groq whisper-large-v3-turbo (dev default) / Yandex SpeechKit v3 (sovereignty).
**Avoids:** Pitfall 5 (async job + poll for longer clips; cap recording ~2 min), Pitfall 9 (private bucket, signed URLs, delete after transcribe, store only transcript + hash), UX pitfall (re-record / edit-transcript step).

### Phase 13: Learn-from-correction loop + low-confidence review queue
**Rationale:** needs real correction volume from Phases 11-12 to be meaningful.
**Delivers:** KbReviewQueueTab.tsx over agent_review_queue with one-click curate (create alias / create catalog entry / dismiss); few-shot injection from curated agent_corrections into extract/prompt.ts (capped, ADMIN-toggled); auto-propose aliases from repeated corrections; SSE streaming on /api/agent/extract.
**Addresses:** low-confidence review queue, few-shot self-improvement (differentiators).
**Avoids:** UX pitfall (corrections visibly teach the agent - "zapomneno").

### Phase 14: Eval calibration + regression gate + cost/drift monitoring
**Rationale:** needs accumulated golden cases and production parse-log data.
**Delivers:** golden set grown to 100-300 real cases (fed from corrections + low-confidence misses); calibration doc mapping the queue threshold to measured per-bucket precision; npm run eval wired as a release gate that blocks any field-precision regression below baseline; daily cost view over the parse log; AI_MONTHLY_BUDGET_RUB kill-switch; production sampling / drift monitoring; admin "AI status" strip (validateAgentConfig()).
**Avoids:** Pitfall 2 (calibration), Pitfall 6 (cost dashboard, budget kill-switch), Pitfall 10 (regression gate, drift monitoring).

### Phase Ordering Rationale

- Dependency spine: KB schema -> ingest (fills KB) -> AI abstraction + resolver (needs KB for grounding context) -> text extraction UI (needs extractPlan) -> voice (thin layer on text) -> correction loop (needs correction volume) -> calibration (needs golden-set + prod data).
- Grouping by architecture: KB CRUD stays on /api/db; everything that calls a provider or takes multipart goes in the /api/agent/* group from Phase 10 onward - the split is drawn once and held.
- Avoiding pitfalls by sequencing: the eval harness skeleton and the provider abstraction (with >=2 adapters + mock) both land in the first AI phase, not retrofitted; RLS policies land with each table; the enrichment-layer schema decision is made in Phase 8 before any code depends on it.

### Research Flags

Phases likely needing /gsd-plan-phase --research-phase <N> during planning:
- Phase 9: messy real-.xls parsing - SheetJS merged-cell / !merges behaviour, CP1251 exports, 2012-era template variants; verify against the actual Titul/Konstruktiv/Godovoi plan files. Provider capability for optional LLM-assisted classification.
- Phase 10: provider REST-API specifics (Anthropic Messages, OpenAI, YandexGPT folderId in model URI, GigaChat OAuth + RU TLS cert) not re-verified this session; JSON-Schema subset intersection across providers; Russian lemmatization library spike (no verified JS option). Run gsd-ai-integration-phase for an AI-SPEC.md.
- Phase 12: Yandex SpeechKit v3 custom-vocabulary / domain-model setup for jargon (inv.#, "bort. kamen", "EV #3"); async long-audio endpoint; Safari audio/mp4 handling; Vercel plan / Fluid Compute verification.
- Phase 14: calibration methodology (threshold -> measured precision), drift-monitoring approach for LLM extraction.

Phases with standard patterns (lighter research):
- Phase 8: schema + RLS + CRUD - the project has a well-established pattern (journal.ts, anon_all_* invariant, ROLE_RESTRICTED).
- Phase 11: editable review grid reusing existing journal modal components - established component-architecture pattern; the work is extraction/sharing, not novel design.
- Phase 13: admin queue tab + prompt few-shot injection - conventional once the data model exists.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | MEDIUM | npm versions verified 2026-09-01 (HIGH); provider pricing/RU-accuracy from web search (MEDIUM/LOW); Vercel limits from docs but not the specific project plan (MEDIUM); no canonical RU WER figure for Whisper. |
| Features | MEDIUM | The three product-class patterns are well-established (HIGH); exact fit to the Gormost codebase and Russian-domain specifics is inferential (MEDIUM); no single direct competitor product. |
| Architecture | MEDIUM-HIGH | Integration points read directly from source (HIGH); provider-API REST shapes are general knowledge not re-verified this session (MEDIUM); the KB-schema shape is an open design decision (see reconciliation note 1). |
| Pitfalls | MEDIUM | Architecture facts HIGH from repo inspection; provider-capability details MEDIUM (SEO-heavy sources, verify against official docs in Phase 8/10); STT/RU-provider specifics MEDIUM. |

**Overall confidence:** MEDIUM - the shape of the solution is clear and low-risk; the uncertainty is in provider specifics, the KB-schema decision, and Russian-domain tooling (lemmatization), all of which resolve during Phase 8-10 planning.

### Gaps to Address

- KB schema shape (bridge kb_* island vs enrichment on journal_objects): decide in Phase 8 planning; recommended default is enrichment keyed to the journal catalog (reconciliation note 1). Write the full catalog map into ARCHITECTURE.md first.
- v1 default provider (Anthropic+Groq vs Yandex/self-hosted): force the decision in Phase 8; build Anthropic + one RU adapter + mock regardless; the env default follows the confirmed deployment constraint.
- Exact daily_plan_items column list / NOT NULL constraints: confirm against journal migrations 042/051 before Phase 11 wiring.
- Vercel plan + Fluid Compute status for gormost.vercel.app: verify in Phase 8; Hobby is a blocker.
- JS Russian lemmatization library: Phase 10 spike; stemming-only is the fallback.
- Reconciliation between the three existing catalogs: undocumented; document before Phase 9.
- Provider REST-API exact endpoints/headers/schema subsets: re-verify against official docs at Phase 10 implementation time.

## Sources

### Primary (HIGH confidence)
- Repo inspection 2026-09-01 - src/app/api/db/route.ts (single RPC dispatcher, ROLE_RESTRICTED, auto-exposure), src/app/api/timesheet/export/route.ts (bespoke-route precedent), src/lib/api/*, src/lib/api-client.ts, src/lib/supabase.ts, src/components/journal/JournalApp.tsx + data.ts, src/types/index.ts, supabase/migrations/ through 052 (042-052 journal, 050 RLS cautionary tale)
- CLAUDE.md, .planning/PROJECT.md (v3.0 milestone + "Pozzhe, ne v etoi vekhe" deferral list)
- npm registry (npm view 2026-09-01) - ai dist-tags, @ai-sdk/*, zod 4.5.4, xlsx registry frozen at 0.18.5
- claude-api skill (cached 2026-06-24) - Anthropic model IDs + pricing (claude-haiku-4-5 $1/$5, claude-sonnet-5 $2/$10, 200K/1M context)

### Secondary (MEDIUM confidence)
- Vercel docs - 4.5 MB body cap, maxDuration 300 s classic / 800 s Fluid Compute, Active CPU pricing (web search, not direct fetch)
- SheetJS docs / npm advisories - CDN 0.20.3 current, npm stuck at 0.18.5, .xls BIFF support, exceljs cannot read .xls
- Yandex SpeechKit v3 / Cloud docs - v3 modes, RU/EN/TR, per-second billing, on-prem/hybrid; YandexGPT folderId model URI
- GigaChat / SaluteSpeech docs (ai-forever, litellm, developers.sber.ru) - separate OAuth scopes, no anyOf/oneOf/union support, OpenAI-compat proxy
- ai-sdk.dev + vercel/ai issues #5197 / #8427 - generateObject unreliable on openai-compatible, structured-output param bug open Sep 2025
- Claude vs OpenAI structured-outputs comparisons (theneuralbase, digitalapplied) - SEO content, cross-check against official docs
- Human-in-the-loop / IDP workflow sources (LandingAI, RedHub, DEV Community, arXiv 2108.00941 & 2605.25226) - exception-review vs approval-model productivity
- Bulk-import UX sources (Smart Interface Design Patterns, CSVBox, C# Corner, AppMaster) - file->map->validate->submit, staging, partial import
- Grounding / active-learning sources (arXiv 2407.12858, Moveworks, K2view, V7 Labs, MedCATTrainer arXiv 1907.07322) - RAG grounding, corrections as labeled data
- Prompt-injection defenses (EvidentlyAI, tldrsec/prompt-injection-defenses, Microsoft MSRC, dev.to spotlighting test) - message boundary, randomized delimiters, strict phrasing
- LLM eval / golden dataset / regression gate sources (Langfuse, Braintrust, futureagi) - field-level metrics, offline eval, release gate
- STT comparison (northflank, promptquorum, faster-whisper #1030, Mike-Kuznetsov RU comparison) - faster-whisper ~12x realtime large-v3 int8, RU high-resource for Whisper

### Tertiary (LOW confidence)
- No canonical Russian WER figure found for Whisper large-v3 (domain-dependent estimate ~10-15%)
- No verified JS Russian lemmatization library (az/azes, lets-declension, natural RU stemmer, pymorphy2-equivalent) - needs a Phase 10 spike
- n8n NL-date-parsing workflow template - illustrative only

---
*Research completed: 2026-09-01*
*Ready for roadmap: yes*
