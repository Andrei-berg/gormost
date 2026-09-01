# Feature Research: v3.0 «Планировщик-агент»

**Domain:** AI-assisted operations planning — natural-language dictation/paste → structured day-plan rows, plus a permanent knowledge-base (catalog) training & curation tool. Human-in-the-loop, review-before-commit.
**Project:** Gormost — Lefortovo tunnel operations (ГБУ «Горьмост»)
**Researched:** 2026-09-01
**Confidence:** MEDIUM (generic patterns for the three product classes are well-established → HIGH; exact fit to the Gormost codebase and Russian-domain specifics → MEDIUM; no single direct competitor product for this niche → MEDIUM)

---

## Context: the three product classes and how they map here

| Class | Generic name in industry | Gormost instance |
|-------|--------------------------|------------------|
| **(1) NL → structured task rows** | "intelligent document / text extraction with human review", "escalation workflow", A2I-style review queue | «🎤 Надиктовать план» in `/journal` and `/dispatcher`: voice or pasted text → N draft rows `{объект, служба, работа, период, люди, техника, уверенность, исходная фраза}` → edit in preview → «Создать черновики» writes unpublished `daily_plan_items` |
| **(2) KB training & curation** | "data import wizard" + "controlled-vocabulary / taxonomy management" + "active-learning label queue" | ADMIN training tool: Excel ingest (Титул / Конструктив / Годовой план) → classify → staging → diff/preview → partial accept → commit to catalog; alias manager; low-confidence review queue; "learn from correction" |
| **(3) Grounding + closing the loop** | "RAG grounding against a knowledge graph / entity resolution against a controlled vocabulary" + "corrections as labeled data" | Extraction resolves every entity against the curated catalog + alias table; unresolved is flagged, never invented; every preview fix becomes a new alias / queue item |

The **industry-standard escalation model** (AI auto-handles the confident majority, humans review only exceptions) is the north star: research on document-AI workflows reports ~71% median productivity gains for exception-review models vs ~30% for "human reviews every output" approval models. v1 does not need to hit auto-accept — but the architecture (per-field confidence → lanes) should be built so it can.

---

## Concrete mechanics (quality-gate items)

### What a "mapping" (alias) is

A single row in a new `entity_aliases` table:

```
surface          text     -- what a human says/writes, normalized (lowercased, punctuation-folded): "борт. камень", "эв №3", "тт 3 ктр"
canonical_type   enum     -- 'object' | 'construction' | 'work_type' | 'service'
canonical_id     text     -- FK into objects / constructions / work_types / services
scope_object_id  text?    -- optional: alias only valid inside this object (same abbrev, different tunnel)
weight           int      -- tie-breaker when several aliases share a surface
source           enum     -- 'seed' (from xls) | 'manual' | 'voice' | 'correction'
created_by       text
created_at       timestamptz
```

Plus **entity-level attributes** the agent needs to fill a plan row, added as columns on `work_types` (or a sibling table):
`service_id` (which service owns this work), `unit` (ед.изм.), `typical_period` (день/ночь/сутки), `typical_crew` (jsonb: workers/foremen/ИТР/vehicles). These are the "typical period and composition" the milestone calls for. Годовой план xls is the seed source.

So the **KB = existing catalog tables (`categories → objects → constructions → work_types`) + `entity_aliases` + work-type attribution columns.** No embeddings / vector store required for v1 — the catalog is small (one участок, dozens–hundreds of objects), so deterministic fuzzy match (the same routine already used by the "Новая запись плана" object combobox) + exact alias lookup is enough and is fully reviewable.

### How confidence is surfaced in the preview

Per row, **per field**, a status chip — not a raw number as the primary signal:

- 🟢 **resolved** — exact alias hit or fuzzy score above the "accept" threshold; field bound to a canonical catalog entity.
- 🟡 **fuzzy** — best match below "accept" but above "floor"; shows the candidate plus a ranked list of alternatives to pick from.
- 🔴 **unresolved** — no match above floor; the raw phrase is kept as free text; row cannot be committed until a human picks an entity or chooses "create new".

The numeric score (0–1) lives in a tooltip. **The «исходная фраза» (source phrase) is always displayed next to the row**, so the reviewer confirms against what was actually said rather than re-reading anything. An overall row-confidence chip aggregates the fields. Rows are sorted worst-confidence-first so review starts where it matters.

### What the human can do in the preview (review-before-commit)

- **Inline-edit any field** with the *same widgets as the existing manual `/journal` "Новая запись плана" modal**: object combobox (fuzzy match + on-the-fly create), service picker, work-text field, period toggle (день/ночь/сутки), crew counters (люди/мастера/ИТР/техника).
- **Accept row / reject row.** **Bulk-accept all 🟢 rows.**
- **Split one row → two** (one dictated sentence mentioned several works or several objects — "multi-item").
- **Merge two rows → one** (dictation repeated / over-segmented).
- **Reassign a row to another service** (one dictation covering several services is auto-grouped by service; the human can override the grouping — "multi-assignee/multi-service split").
- **Pick from ranked candidates** for a 🟡 field.
- **"Запомнить исправление"** toggle per edit: when a human changes an entity binding, offer to persist `surface → canonical` into `entity_aliases`. Default **on** for 🔴→picked and 🔴→create-new; **prompt** when correcting a wrong 🟢/🟡 match (so a one-off typo does not pollute the KB).
- **«Создать черновики»** — writes accepted rows into `daily_plan_items` as **unpublished**, for the chosen date + shift. Publishing stays the existing manual «📢 Опубликовать смену» action. The agent never publishes.

### The correction-learning loop (class 3, closing it)

1. Every preview edit that changes an entity resolution is logged: `plan_parse_corrections {session_id, raw_phrase, field, model_value, model_confidence, human_value, action}`.
2. **On commit**, confirmed 🔴→picked and wrong-match fixes are written to `entity_aliases` (`source='correction'`). This is the "learning" — deterministic, inspectable, instantly effective on the next parse. **No model retraining in v1.**
3. Parses/rows that were low-confidence *or* rejected *or* heavily edited also land in the **ADMIN low-confidence review queue**, where ADMIN turns them into aliases, new catalog entries, or dismisses them. This is a standard active-learning "route the ambiguous top-k to a human oracle" queue.
4. *(Differentiator, optional)* accumulated high-value corrections are injected into the extraction prompt as **few-shot examples**, capped in count, curated by ADMIN — a second, softer feedback path.

---

## Feature Landscape

### Table Stakes (needed for a usable v1)

| Feature | Why expected | Complexity | Notes / dependencies |
|---------|--------------|------------|----------------------|
| **Text-paste → structured rows** (`extractPlan`) producing `{объект, служба, работа, период, люди, техника, исходная фраза}` | This *is* the milestone's core promise | HIGH | New `src/lib/ai/` layer; prompt engineering; output schema validation. Depends on KB grounding below. |
| **KB grounding / entity resolution** — every extracted entity matched to catalog + `entity_aliases`; unmatched → 🔴 free text, **never invented** | Anti-hallucination is the whole reason to build a curated KB; "resolves rather than invents" is stated in PROJECT.md guardrails | MEDIUM | Reuse existing fuzzy-match routine from the object combobox. New `entity_aliases` table (+ `anon_all_entity_aliases` RLS policy). Guardrail lives above the provider adapter. |
| **Per-field confidence chips + source phrase shown** | Reviewer must know where to look; table stakes in every doc-AI review UI | MEDIUM | 3 lanes (🟢/🟡/🔴) from two thresholds in config. Sort worst-first. |
| **Editable preview reusing the manual-modal widgets** (object combobox w/ create, service picker, period, crew counters) | Consistency with `/journal`; avoids a second data-entry paradigm | MEDIUM | Hard dependency on existing "Новая запись плана" modal components — extract/share them. |
| **Per-row accept/reject + bulk-accept greens** | Basic partial-acceptance; "explicit opt-in for partial import" is the documented safe pattern | LOW | — |
| **«Создать черновики» → write unpublished `daily_plan_items`** | The only sanctioned write target; agent must not touch `requests` / `work_plans` | MEDIUM | Hard dependency on `daily_plan_items` schema (journal migrations 042/051). Fill the subset the agent knows; leave specialty breakdown / named crew / garage numbers blank for the human. |
| **Multi-service dictation → rows grouped by service** | One spoken briefing routinely spans several services; splitting is explicitly required | MEDIUM | Grouping key = resolved `service_id`; human can override in preview. |
| **Multi-item split** (one sentence → several rows) | Dictation is not one-work-per-sentence | MEDIUM | Prompt + a pure splitting function (unit-testable). |
| **Alias / synonym manager (CRUD)** in the ADMIN training tool | The KB backbone; PROJECT.md calls out a dedicated "таблица синонимов/алиасов" | MEDIUM | `entity_aliases` CRUD via `/api/db` + `api-client.ts`. Search, add/edit/delete, show `source`, collision detection (one surface → two canonicals). |
| **Excel ingest pipeline: upload → column-map → staging → diff/preview → partial accept → commit** for the 3 known sheet shapes | Standard "file → map → validate → submit" import UX; seeding the KB by hand is infeasible | HIGH | New staging tables `catalog_import_batches` / `catalog_import_rows` (+ RLS). Preset column maps for Титул / Конструктив / Годовой план. Row classification = which catalog level (object / construction / work_type / alias). Diff states: new / changed / duplicate / conflict. Commit only checked rows. |
| **Work-type attribution columns** (`service_id`, `unit`, `typical_period`, `typical_crew`) | Agent needs "чья служба + типовой период + состав" to pre-fill a row | LOW–MEDIUM | Migration on `work_types`; seeded from Годовой план; editable in `/admin` "Виды работ" tab. |
| **Provider-independent AI layer** — `extractPlan()` + `transcribe()` interfaces, ≥1 working adapter, guardrails above the adapter (entity whitelist, confidence thresholds, parse log, max-rows, timeout → manual fallback), provider chosen via env/config | Explicitly required; also de-risks the LLM/STT vendor choice (Anthropic / OpenAI / YandexGPT / GigaChat / self-hosted) | MEDIUM–HIGH | New `src/lib/ai/`. Do **not** rename existing env vars; add new ones. Keys server-side only (route through `/api/db` or a sibling API route). |
| **"Запомнить исправление" → correction becomes an alias** (at least 🔴→picked / 🔴→create-new) | Closes the loop; each fix must make the next parse better | LOW–MEDIUM | Writes `entity_aliases (source='correction')` + logs `plan_parse_corrections`. |
| **Voice input: record → transcribe → same text pipeline** | Milestone names "🎤 Надиктовать"; a dispatcher's hands are busy | MEDIUM | Browser MediaRecorder → `transcribe()` adapter (Yandex SpeechKit / Whisper / self-hosted). Transcript shown & editable before extraction runs. Separable from the text path — can ship days after if the STT adapter slips. |

### Differentiators (worth doing — complexity called out)

| Feature | Value proposition | Complexity | Notes / dependencies |
|---------|-------------------|------------|----------------------|
| **Low-confidence review queue with one-click curate** (create alias / create catalog entry / dismiss) | Turns the exhaust of every parse into KB growth; classic active-learning oracle queue | MEDIUM | Reads `plan_parse_corrections` + low-confidence sessions. ADMIN-only. |
| **Voice entity-add in the training tool** ("добавить объект: аварийный выход три, синонимы ЭВ-3, ЭВ №3") | Fast KB seeding without a keyboard; parity with the plan-side voice UX | HIGH | Needs a small command grammar / second extraction prompt; ambiguous ("это объект или конструктив?") → confirm dialog. |
| **Ambiguity picker with context** — 🟡 field shows ranked candidates with disambiguating context (which tunnel, which service) | Reviewer resolves in one click instead of retyping | MEDIUM | Requires candidate scoring to return top-k, not just top-1. |
| **Scope-aware aliases** (same abbreviation means different things per tunnel/object) | Lefortovo has ЛТР/ГТР/ТТК/ЗБ with overlapping shorthand | MEDIUM–HIGH | `scope_object_id` on `entity_aliases`; resolver must consider the row's object when disambiguating. |
| **Ingest conflict detection** (same инв.№ → different address; same object name → different category) | Prevents silently corrupting the catalog on re-import | MEDIUM–HIGH | Diff engine compares staging rows against live catalog on business keys (инв.№, name+parent). |
| **Inline "create new catalog entry" from the plan preview** (not only in the training tool) | Dispatcher hits an unknown object at 16:20 and keeps moving; ADMIN reviews later via the queue | MEDIUM | New entries created from the plan side are flagged `provisional` and surface in the ADMIN queue. |
| **Coverage / KB-health dashboard** (work_types without service, objects without aliases, orphan constructions, most-corrected surfaces) | Tells ADMIN where curation effort pays off | MEDIUM | Read-only aggregates over catalog + `entity_aliases` + corrections. |
| **Few-shot self-improvement** — curated corrections injected as examples into the extraction prompt | Catches phrasing patterns aliases can't (sentence structure, ordering) | MEDIUM | Cap example count; ADMIN toggles which corrections are "exemplary"; watch prompt-size/cost creep. |
| **Row merge + advanced split UI** (drag a phrase fragment into its own row) | Handles messy real dictation cleanly | MEDIUM | Pure-function core is testable; the UI is the cost. |
| **Parse-session history / undo-redo** | "I accidentally rejected that row"; audit of what the agent proposed vs what shipped | LOW–MEDIUM | `plan_parse_sessions` table; ties into existing `changelog` conventions. |
| **Multi-turn correction re-parse** ("нет, всё это ночная смена") | Conversational fix instead of per-row clicks | HIGH | Pushes toward a chat paradigm — resist unless clearly needed; borderline anti-feature for v3.0. |
| **Confidence-threshold auto-tuning from correction history** | Thresholds stay calibrated as the KB matures | HIGH | Defer — needs enough correction volume to be meaningful. |

### Anti-Features (explicitly OUT of scope for v3.0)

| Feature | Why it gets requested | Why problematic now | Instead |
|---------|-----------------------|---------------------|---------|
| **Annual plan-график scheduling** (month-by-month execution control from Годовой план) | The xls is right there | Whole separate planning domain; huge scope; not the daily-dispatch problem | Годовой план is a *seed source for work-type vocabulary only*; period/objём/materials columns are read for `typical_period`, the rest ignored. Deferred per PROJECT.md. |
| **Materials & consumption norms** | Also in the xls | Inventory domain; no consumer in the daily plan | Skip the "материалы/норма" columns entirely. |
| **Agent auto-creates `requests` (заявки) or `work_plans` (план-наряды)** | "If it can draft a plan, let it file the заявка" | Bypasses the head→zam→chief→boss approval chain; the journal is deliberately a stats/printing tool, not a funnel into `work_plans` | Agent writes **only** unpublished `daily_plan_items`. Humans use existing flows. |
| **Volumes / нормо-часы / labor calculation** | Looks like a natural extension of crew counts | Estimation engine; needs norms data & validation; out of the dictation problem | Crew counts are free integers the human sets; no calculation. |
| **Full 59-section asset registry** (фонтаны, памятники, набережные, Кремль) | "Do it once, do it whole" | Order-of-magnitude more catalog data; most never appears in a tunnel day-plan | KB scope = участок Гормост-Лефортово only (ЛТР + Шереметьевский/Митьковский/Нижегородский, ТТК пешеходные, ЗБ ЛТР/ГТР, мосты участка). |
| **Auto-publish of drafts** | "Save the human a click" | Removes the human gate the whole design depends on | Drafts are always unpublished; existing «📢 Опубликовать смену» stays manual. |
| **Fine-tuning / training a custom NER model** | "Learn from corrections" sounds like ML training | Ops, data-volume, reproducibility and review burden; not needed at this catalog size | "Learning" = growing `entity_aliases` + optional curated few-shot. Deterministic, inspectable. |
| **Agent assigns workers by name (пофамильно)** | Foreman does it anyway | Brigade formation is the foreman's authored step (`work_assignments`); different data, different panel | Agent fills crew *counts* and (optionally) named-crew-by-service hints; the foreman assigns individuals. |
| **Conversational chat agent** | LLM = chatbot in people's minds | One-shot extract→review is faster to build, easier to bound, easier to guardrail | Single-turn: paste/dictate → preview → commit. Re-run for a new attempt. |
| **Agent launches наряд-допуск / moves plan statuses / approves anything** | "Full automation" | Safety- and authority-sensitive; work-permit catalog is a separate subsystem | Untouched by v3.0. |
| **Real-time collaborative preview editing** | Multiple dispatchers | Concurrency complexity for a rare case; the preview is a seconds-to-minutes transient | Single editor per parse session. |
| **Vector DB / embeddings store for retrieval** | "RAG best practice" | Overkill for one small участок catalog; adds infra + a non-reviewable matching path | Exact alias lookup + deterministic fuzzy match; revisit only if the catalog grows past a few thousand entities. |

---

## Feature Dependencies

```
[entity_aliases table + work_type attribution columns]        (KB schema — foundation)
        └──required by──> [KB grounding / entity resolution]
                                └──required by──> [extractPlan text pipeline]
                                                      └──required by──> [confidence chips + preview]
                                                                            └──required by──> [«Создать черновики» → daily_plan_items]
                                                      └──required by──> [multi-service split] , [multi-item split]

[Provider-independent AI layer + guardrails]
        └──required by──> [extractPlan text pipeline]
        └──required by──> [transcribe() voice input]

[transcribe() voice input] ──enhances──> [extractPlan text pipeline]   (feeds it a transcript; not required)

[Excel ingest pipeline] ──populates──> [catalog tables] ──populate──> [entity_aliases via seed]
[Alias manager CRUD] ──maintains──> [entity_aliases]

[Editable preview] ──emits──> [plan_parse_corrections log]
        └──feeds──> ["Запомнить исправление" → new alias]   (closes the loop, back to KB grounding)
        └──feeds──> [Low-confidence review queue] ──feeds──> [Alias manager / new catalog entry]

[Existing "Новая запись плана" modal widgets] ──reused by──> [Editable preview]
[Existing object combobox fuzzy-match] ──reused by──> [KB grounding]
[Existing daily_plan_items schema] ──write contract for──> [«Создать черновики»]
[Existing /api/db + api-client.ts + ROLE_RESTRICTED] ──carries──> [all new server functions]
[Existing useLoadData / PanelLoader / DataErrorBanner / useConfirm] ──used by──> [all new panels]
```

### Dependency notes

- **KB schema is phase 1 of everything.** `entity_aliases` + work-type attribution must land (with `anon_all_*` RLS policies, per the CLAUDE.md invariant) before grounding, which must exist before extraction is useful.
- **Grounding sits above the provider adapter, not inside it.** Swapping Anthropic↔YandexGPT must not touch the whitelist / thresholds / parse-log code. Build the guardrail layer as its own module.
- **The preview reuses journal components** — budget time to extract the "Новая запись плана" modal's object combobox, service picker, period toggle and crew counters into shared components before the preview can be built.
- **`daily_plan_items` is a hard write contract.** Match its columns exactly (object, service, work_text, required workers/foremen/ИТР/vehicles, specialty breakdown, garage numbers, named crew, «по распоряжению» flags). The agent fills a subset; everything else stays at default/blank for the human.
- **The correction loop depends on the preview logging edits**, which depends on the preview knowing the model's original value per field — carry `model_value` + `model_confidence` through to the UI, not just the resolved value.
- **Excel ingest is independent of the extraction pipeline** and can be built in parallel; it only shares the catalog tables and the diff/preview UX idiom.
- **Voice is a thin front-end on the text pipeline** — it can be cut to v1.x without touching extraction, at the cost of the headline "надиктовать" demo.

---

## MVP Definition

### Launch with (v1) — the usable minimum

- [ ] **KB schema**: `entity_aliases` (+ scope, source, RLS policy) and `work_types` attribution columns (`service_id`, `unit`, `typical_period`, `typical_crew`) — nothing else works without it.
- [ ] **Excel ingest pipeline** for Титул / Конструктив / Годовой план: upload → preset column-map → staging → diff/preview (new/changed/duplicate) → checkbox partial accept → commit. Conflict detection can be a v1.x hardening pass; duplicate detection is v1.
- [ ] **Alias manager CRUD** (ADMIN) with search, source display, and one-surface-two-canonicals collision warning.
- [ ] **Provider-independent AI layer**: `extractPlan()` + `transcribe()` interfaces, one working LLM adapter, one working STT adapter, guardrails module (entity whitelist, two confidence thresholds in config, `plan_parse_sessions` + `plan_parse_corrections` log, max-rows cap, timeout → "fall back to manual modal").
- [ ] **Text-paste extraction** → rows with per-field 🟢/🟡/🔴 chips + «исходная фраза».
- [ ] **KB grounding** (exact alias + fuzzy match, never-invent rule) feeding those chips.
- [ ] **Editable preview** reusing journal widgets; per-row accept/reject; bulk-accept greens; multi-service grouping (override allowed); multi-item split.
- [ ] **«Создать черновики»** → unpublished `daily_plan_items` for a chosen date+shift.
- [ ] **"Запомнить исправление"** → 🔴→picked / create-new becomes an `entity_aliases` row.
- [ ] **Voice path**: record → transcribe → editable transcript → same extraction. *(P1, but the only item safely cuttable to v1.x if the STT adapter is not ready — flag this at roadmap time.)*
- [ ] **Entry points**: «🎤 Надиктовать план» button in `/journal` (BOSS/ADMIN) and `/dispatcher` (DISPATCHER/BOSS/ADMIN), gated via `ROLE_RESTRICTED`.
- [ ] **Tests** (Vitest, pure logic only): alias/fuzzy resolution & scoring, multi-item splitting, row→`daily_plan_item` mapping, Excel row classification. Not the LLM/STT calls.

### Add after validation (v1.x)

- [ ] **Low-confidence review queue** with one-click curate — add once there is correction volume to triage.
- [ ] **Ingest conflict detection** (инв.№ / name+parent collisions vs live catalog).
- [ ] **Ambiguity picker with disambiguating context** for 🟡 fields.
- [ ] **Inline "create new catalog entry" from the plan preview** (provisional flag → queue).
- [ ] **Row merge + drag-to-split UI**.
- [ ] **Parse-session history / undo**.
- [ ] **Second LLM / STT adapter** (e.g. YandexGPT + SpeechKit alongside Anthropic + Whisper) to prove the abstraction.

### Future consideration (v2+)

- [ ] **Voice entity-add** in the training tool (needs command grammar; high effort for a keyboard-adjacent gain).
- [ ] **Scope-aware alias resolution** across ЛТР/ГТР/ТТК/ЗБ.
- [ ] **Few-shot self-improvement** from curated corrections.
- [ ] **KB-health / most-corrected-surface dashboard**.
- [ ] **Confidence-threshold auto-tuning**.
- [ ] **Multi-turn conversational correction** — only if single-turn review proves too slow in practice.

---

## Feature Prioritization Matrix

| Feature | User value | Impl. cost | Priority |
|---------|-----------|-----------|----------|
| KB schema (`entity_aliases` + work-type attribution) | HIGH | LOW | P1 |
| Provider-independent AI layer + guardrails | HIGH | MEDIUM–HIGH | P1 |
| Text-paste extraction (`extractPlan`) | HIGH | HIGH | P1 |
| KB grounding / never-invent resolution | HIGH | MEDIUM | P1 |
| Per-field confidence chips + source phrase | HIGH | MEDIUM | P1 |
| Editable preview (reuse journal widgets) | HIGH | MEDIUM | P1 |
| «Создать черновики» → `daily_plan_items` | HIGH | MEDIUM | P1 |
| Multi-service + multi-item split | HIGH | MEDIUM | P1 |
| Alias manager CRUD | HIGH | MEDIUM | P1 |
| Excel ingest (upload→map→stage→diff→partial accept) | HIGH | HIGH | P1 |
| "Запомнить исправление" → alias | HIGH | LOW–MEDIUM | P1 |
| Voice input (record→transcribe→pipeline) | HIGH | MEDIUM | P1 (cuttable to P2 if STT slips) |
| Low-confidence review queue | MEDIUM–HIGH | MEDIUM | P2 |
| Ingest conflict detection | MEDIUM–HIGH | MEDIUM–HIGH | P2 |
| Ambiguity picker w/ context | MEDIUM | MEDIUM | P2 |
| Inline create-catalog-entry from preview | MEDIUM | MEDIUM | P2 |
| Row merge / advanced split UI | MEDIUM | MEDIUM | P2 |
| Parse-session history / undo | MEDIUM | LOW–MEDIUM | P2 |
| Second LLM/STT adapter | MEDIUM | LOW–MEDIUM | P2 |
| Voice entity-add (training tool) | MEDIUM | HIGH | P3 |
| Scope-aware aliases | MEDIUM | MEDIUM–HIGH | P3 |
| Few-shot self-improvement | MEDIUM | MEDIUM | P3 |
| KB-health dashboard | MEDIUM | MEDIUM | P3 |
| Threshold auto-tuning | LOW–MEDIUM | HIGH | P3 |
| Multi-turn conversational correction | LOW–MEDIUM | HIGH | P3 |

**Priority key:** P1 = must have for launch · P2 = should have, add when possible · P3 = future.

---

## Competitor / prior-art feature analysis

No single product targets "Russian tunnel-ops dictation → day-plan"; the pattern is assembled from adjacent categories.

| Capability | How doc-AI / IDP tools do it (AWS Textract + A2I, UiPath Action Center, LandingAI, Azure DI) | How import / taxonomy tools do it (CSVBox, Flatfile-style wizards, PoolParty/VocBench, MedCATTrainer) | Gormost v3.0 approach |
|-----------|------------------------------------------------------------------|--------------------------------------------------------------|----------------------|
| Confidence routing | Per-field score → auto-accept / review-queue / reject lanes; weekly sample audit | n/a | 🟢/🟡/🔴 chips from two thresholds; v1 = all rows reviewed, lanes architected for later auto-accept |
| Source traceability | Bounding-box citation back to the document region | n/a | «исходная фраза» shown beside every row |
| Review UI | Confirm-or-correct on the flagged field, not a full re-read; alternative predictions shown | Editable preview grid, invalid rows flagged, import-valid-only | Inline edit with journal widgets; ranked alternatives for 🟡; accept/reject/split/merge |
| Bulk ingest | n/a | file → map → validate → submit; staging tables; explicit opt-in partial import; downloadable template; fuzzy column auto-map with confidence | Preset column maps per known sheet; staging tables; diff states; checkbox partial accept |
| Vocabulary / synonyms | n/a | preferred term + altLabels/synonyms; alias governance; collision checks | `entity_aliases` (surface→canonical, typed, optionally object-scoped); collision warning |
| Learning from corrections | A2I feedback loop; MedCATTrainer active learning — corrections retrain the concept DB | Human relabels ambiguous top-k | Correction → alias (deterministic) + review queue; optional curated few-shot; **no model retraining** |
| Grounding | Agentic RAG against a knowledge graph of org-specific entities to constrain hallucination | Controlled vocabulary as the target schema | Extraction constrained to catalog + aliases; unresolved is surfaced, never fabricated |
| Provider independence | Mostly single-vendor (locked to the platform) | n/a | Explicit adapter interface (`extractPlan` / `transcribe`), env-selected; a genuine differentiator vs the incumbents |

---

## Sources

- [Human in the Loop: Using Confidence Scores to Build Reliable Document Extraction (DEV Community)](https://dev.to/iterationlayer/human-in-the-loop-using-confidence-scores-to-build-reliable-document-extraction-3pnb) — MEDIUM
- [Building Human-in-the-Loop Review Workflows for Document AI (LandingAI)](https://landing.ai/llms/building-human-in-the-loop-review-workflows-for-document-ai) — MEDIUM
- [Human-in-the-Loop Document Processing, Done Right (RedHub AI)](https://blog.redhub.ai/human-in-the-loop-document-processing) — MEDIUM
- [From Automation to Collaboration: Human-in-the-Loop Methods for Safe and Trustworthy NLP (arXiv)](https://arxiv.org/html/2605.25226) — MEDIUM
- [A Survey of Human-in-the-loop for Machine Learning (arXiv)](https://arxiv.org/pdf/2108.00941) — MEDIUM
- [How To Design Bulk Import UX (Smart Interface Design Patterns)](https://smart-interface-design-patterns.com/articles/bulk-ux/) — MEDIUM
- [Best UX flow for spreadsheet imports (CSVBox)](https://blog.csvbox.io/spreadsheet-import-ux/) — MEDIUM
- [AI Auto-Mapping for Spreadsheet Imports (CSVBox)](https://blog.csvbox.io/ai-auto-mapping-spreadsheet-imports/) — MEDIUM
- [Building a Universal Data Import Wizard (C# Corner)](https://www.c-sharpcorner.com/article/building-a-universal-data-import-wizard-mapping-columns-preview-validation/) — MEDIUM
- [CSV import column mapping UI: safer matching, defaults, previews (AppMaster)](https://appmaster.io/blog/csv-import-column-mapping-ui) — MEDIUM
- [Grounding and Evaluation for Large Language Models: Practical Challenges and Lessons Learned (arXiv survey)](https://arxiv.org/pdf/2407.12858) — MEDIUM
- [AI grounding: How agentic RAG will help limit AI hallucinations (Moveworks)](https://www.moveworks.com/us/en/resources/blog/improved-ai-grounding-with-agentic-rag) — MEDIUM
- [RAG hallucination: What is it and how to avoid it (K2view)](https://www.k2view.com/blog/rag-hallucination/) — MEDIUM
- [Active Learning in Machine Learning — Guide & Examples (V7 Labs)](https://www.v7labs.com/blog/active-learning-guide) — MEDIUM
- [MedCATTrainer: A Biomedical Free Text Annotation Interface with Active Learning (arXiv)](https://arxiv.org/pdf/1907.07322) — MEDIUM (directly analogous: corrections curate a concept DB)
- [Parse natural language dates with GPT-4o for smart scheduling (n8n workflow template)](https://n8n.io/workflows/5460-parse-natural-language-dates-with-openai-gpt-4o-for-smart-scheduling/) — LOW
- Project docs: `/home/user/Projects/gormost/.planning/PROJECT.md` (milestone v3.0 section), `/home/user/Projects/gormost/CLAUDE.md` (journal, `daily_plan_items`, catalog, `/api/db`, RLS invariant, component architecture) — HIGH

---
*Feature research for: AI-assisted ops planning (NL→plan rows) + KB training/curation — Gormost v3.0*
*Researched: 2026-09-01*
