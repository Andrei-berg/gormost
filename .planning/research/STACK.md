# Stack Research

**Domain:** AI-assisted work-planning (Russian STT + LLM structured extraction) bolted onto an existing Next.js 16 / Supabase / Vercel app
**Researched:** 2026-09-01
**Confidence:** MEDIUM (versions verified against npm registry 2026-09-01; provider pricing/accuracy from web search, MEDIUM/LOW; Vercel limits verified against Vercel docs)

---

## TL;DR

| Concern | Recommendation |
|---|---|
| Provider-agnostic boundary | **Own it.** Two hand-written interfaces (`extractPlan`, `transcribe`) + 1 adapter file per backend. ~150 LOC. No framework. |
| LLM transport inside adapters | **Vercel AI SDK v5** (`ai@5`, `@ai-sdk/anthropic`, `@ai-sdk/openai`, `@ai-sdk/openai-compatible`) for Anthropic + OpenAI + self-hosted/vLLM. Raw `fetch` adapters for YandexGPT & GigaChat. |
| Structured output strategy | **Prompt-instructed JSON + Zod `safeParse` + one repair retry — uniformly, for every provider.** Do NOT depend on provider-native constrained decoding (unreliable across the 4 backends). |
| Default LLM | **Anthropic `claude-haiku-4-5`** for extraction; escalate low-confidence re-parses to `claude-sonnet-5`. Sovereignty profile: YandexGPT or self-hosted Qwen-class. |
| Default STT (dev/demo) | **Groq `whisper-large-v3-turbo`** — cheapest, ~200x realtime, trivial REST. |
| Default STT (RU-gov production) | **Yandex SpeechKit v3** (RU-tuned, data-residency, on-prem option) or **self-hosted faster-whisper large-v3** on one GPU box. |
| Browser capture | Native **MediaRecorder API** → `audio/webm;codecs=opus`. No library, no transcode. |
| Audio upload path | Browser → **Supabase Storage** (signed upload URL) → server function reads from Storage → provider. Never POST audio through a Vercel function body (4.5 MB cap). |
| Legacy Excel parsing | **SheetJS `xlsx` 0.20.3 from the SheetJS CDN tarball** (NOT npm `xlsx@0.18.5`). Only lib that reads messy `.xls` (BIFF) + `.xlsx` in one API. Server-only, Node runtime. |
| Runtime | **Node.js runtime** (`export const runtime = 'nodejs'`) for every new route. Never Edge. |
| Validation | **Zod 4** (`zod@4`) — schemas + `z.toJSONSchema()` + output validation. New dep, justified. |

---

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| `ai` (Vercel AI SDK) | `5.x` (npm dist-tag `ai-v5`, currently **5.0.250**) | Unified `generateText`/`generateObject` across Anthropic, OpenAI, and any OpenAI-compatible endpoint; streaming helpers for the extraction UI | It *is* the provider-agnostic LLM layer the industry standardised on. Maps one call onto each provider's native mechanism. Pin to v5: `ai@6` (6.0.273) and `ai@7` (7.0.87) also exist — major line churned 3x in ~a year, so keep the SDK **confined to adapter files** and pin a line. React 19 / Next 16 supported from v5 up. |
| `@ai-sdk/anthropic` | `4.x` (**4.0.46**) | Anthropic adapter for the AI SDK | First-party. Models: `claude-haiku-4-5` ($1/$5 per 1M), `claude-sonnet-5` ($2/$10). Supports prompt caching — cache the catalog/system prefix. |
| `@ai-sdk/openai` | `4.x` (**4.0.53**) | OpenAI adapter | First-party. `gpt-4o-mini`-class for cheap extraction, `gpt-4o` / `gpt-4.1`-class for hard parses. Also provides `/v1/audio/transcriptions` (`gpt-4o-transcribe`). |
| `@ai-sdk/openai-compatible` | `3.x` (**3.0.41**) | Adapter for self-hosted vLLM / Ollama / LM Studio and any OpenAI-shaped gateway | Lets the "self-hosted" backend and OpenAI-compat proxies (gpt2giga, YandexGPT-to-OpenAI shims) plug in with zero new code. **Caveat:** its *native* structured-output path is buggy (vercel/ai #8427, open Sep 2025) — which is exactly why we standardise on prompt-JSON + Zod instead. `generateText` + streaming are solid. |
| `zod` | `4.x` (**4.5.4**) | Define the `PlanRow[]` extraction schema; `z.toJSONSchema()` to build the LLM tool/JSON contract; `safeParse` to validate model output before it touches `daily_plan_items` | Zod 4 folds in JSON-Schema generation (no `zod-to-json-schema` dep). AI SDK v5 takes Zod 4 schemas directly. This is the enforcement point of the "agent only proposes, never invents entities" guardrail. |
| `xlsx` (SheetJS) | **0.20.3**, installed from `https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz` | Server-side parse of Титул / Конструктив / Годовой план in `.xls` **and** `.xlsx` | The only mature JS lib that reads legacy `.xls` (BIFF2–8), `.xlsx`, `.xlsb`, `.ods` through one `XLSX.read(buf, {type:'buffer'})` call. `exceljs` cannot read `.xls` at all. The npm-registry `xlsx` is frozen at **0.18.5** (4 years stale, past prototype-pollution + ReDoS CVEs fixed only in ≥0.19.3/0.20.2) — **do not use the npm one.** |
| Groq API (`@ai-sdk/groq` or raw REST) | `@ai-sdk/groq` **4.0.35** | Default STT backend for dev/demo: `whisper-large-v3-turbo` | ~$0.04 / audio-hour (~9x cheaper than OpenAI Whisper), 200–228x realtime on LPU (1 h audio ≈ 15 s). Whisper large-v3 handles Russian well (high-resource language, ~7.4% WER on English mixed sets; RU realistically ~10–15% domain-dependent). US-hosted — no RU data residency. |
| Yandex SpeechKit v3 (raw REST/gRPC) | v3 API | Sovereignty-grade STT: RU/EN/TR, streaming + sync (≤30 s) + async long-audio | RU-tuned acoustic models, Yandex Cloud data residency, **on-prem / hybrid deployment of the ML models offered** for sensitive traffic — the answer for a Moscow city-government deployment. Billed per second of 2-channel audio, 15 s minimum, tiered (~0.15–0.9 ₽/min class). |
| Supabase Storage | (already on Supabase) | Holds recorded audio blobs and uploaded `.xls`/`.xlsx` files; staging bucket for import artifacts | Bypasses Vercel's 4.5 MB function body cap via signed upload URLs; same project, same auth model, RLS-governed. Blobs get a short TTL / delete-after-transcribe. |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@anthropic-ai/sdk` | latest `1.x` | Direct Anthropic client behind the `extractPlan` Anthropic adapter | Optional alternative to `@ai-sdk/anthropic` if you want the Anthropic adapter free of AI-SDK coupling. Pick one, not both. |
| `p-retry` | `6.x` | Backoff wrapper for the "one repair retry" and provider 429/5xx | Only if you don't want to lean on AI SDK's built-in `maxRetries`. Tiny. |
| `extendable-media-recorder` + `-wav-encoder` | latest | Force PCM/WAV capture in Safari | **Defer.** Only if Safari-on-iPad is a target and the chosen STT provider rejects Safari's `audio/mp4`. Groq/OpenAI accept mp4; skip this. |
| Postgres `pg_trgm` extension | n/a (Supabase migration) | Fuzzy alias/synonym matching ("борт. камень" ≈ "БК") in the catalog "training" tool | Enable via migration; no npm dependency. Cheaper and more predictable than an embedding store for a small controlled vocabulary. |
| `faster-whisper-server` / `Speaches` (Docker, not npm) | latest | Self-hosted STT exposing an OpenAI-compatible `/v1/audio/transcriptions` | Only for the on-prem STT profile. Runs `faster-whisper` (CTranslate2). The `transcribe` OpenAI adapter then points at it via `baseURL`. |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| `.xls` fixtures in `src/**/__fixtures__/` | Deterministic parser tests against real messy Титул/Конструктив layouts | Commit 2–3 redacted sample files. SheetJS parsing is pure and Node-only — unit-testable with Vitest, matches the project's "core logic gets tests" rule. |
| Zod schema snapshot test | Lock the `PlanRow` contract | If the schema changes, the prompt contract and downstream `daily_plan_items` mapping must change too. |
| `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `GROQ_API_KEY`, `YANDEX_*`, `GIGACHAT_*`, `AI_LLM_PROVIDER`, `AI_LLM_MODEL`, `AI_STT_PROVIDER` | Provider selection + keys, all server-side | Each provider's keys are its own vars (matches milestone spec). `AI_*_PROVIDER` chooses the adapter at runtime. Never `NEXT_PUBLIC_*`. |

---

## Installation

```bash
# LLM abstraction (adapters only import these)
npm install ai@5 @ai-sdk/anthropic@4 @ai-sdk/openai@4 @ai-sdk/openai-compatible@3

# Optional: Groq STT adapter via AI SDK (or just use fetch)
npm install @ai-sdk/groq@4

# Validation / schema / guardrails
npm install zod@4

# Legacy Excel parsing — NOTE: from the SheetJS CDN, NOT npm
npm install --save-exact https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz

# Optional retry helper
npm install p-retry@6
```

```jsonc
// package.json — pin the AI SDK line so a transitive bump doesn't jump v5→v7
"ai": "5.0.250",
"@ai-sdk/anthropic": "^4.0.46",
"xlsx": "https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz"
```

Nothing here is a client bundle cost: `xlsx`, `ai`, and all adapters are imported **only** in server route handlers / `src/lib/ai/`. Guard with `import 'server-only'` (already a dependency).

---

## The provider-agnostic boundary (concrete)

**What the interface is** — two functions, one staging type, living in `src/lib/ai/`:

```ts
// src/lib/ai/types.ts
export interface PlanExtraction {
  rows: PlanRow[];                 // Zod-validated
  model: string;                   // provider/model actually used (for the parse log)
  usage?: { inputTokens: number; outputTokens: number };
}
export interface PlanRow {
  objectRef: string;               // raw phrase, resolved against catalog later
  serviceId: string | null;        // SRV-ENG | SRV-STR | ... | null if unsure
  workText: string;
  period: 'day' | 'night' | 'round' | null;
  workers: number | null;
  vehicles: number | null;
  confidence: number;              // 0..1
  sourcePhrase: string;            // verbatim span from the dictation
}

export interface AiProvider {
  extractPlan(input: { text: string; catalogContext: string }): Promise<PlanExtraction>;
  transcribe(input: { audio: Blob | ArrayBuffer; mimeType: string; languageHint?: 'ru' }): Promise<{ text: string; provider: string }>;
}
```

**What stays provider-specific** (inside `src/lib/ai/adapters/{anthropic,openai,yandex,gigachat,selfhosted}.ts`): base URL, auth scheme (Bearer key vs Yandex IAM token vs Sber OAuth client-credentials), request/response shape, audio container requirements, token-usage field names, model IDs.

**What lives ABOVE the adapter** (provider-independent guardrails — `src/lib/ai/guardrails.ts`):
- The system/extraction prompt (Russian, "разложи, не выдумывай, только из каталога").
- `catalogContext` assembly (inject the participok vocabulary; keeps the model from inventing objects/services).
- `PlanRow` Zod `safeParse` + **one** repair round-trip on failure.
- Confidence thresholding → low-confidence rows go to the "очередь разборов" instead of auto-creating drafts.
- The parse log (input text, provider/model, raw output, accepted rows, human corrections) — feeds "обучение на исправлениях".

**Structured-output decision:** do **not** rely on `generateObject` + provider constrained decoding. Anthropic does tool-use extraction, OpenAI does JSON-schema mode, Yandex/GigaChat/self-hosted vary and the AI-SDK openai-compatible path has an open structured-output bug. Instead every adapter calls `generateText` (or raw completion) with a JSON-only instruction + few-shot, and the guardrail layer does `JSON.parse` → `PlanRow[].safeParse` → repair. Identical behaviour and identical test surface across all 5 backends. This is the single most important architectural call in the milestone.

---

## Default provider vs the pluggable set

| Slot | Default | Pluggable alternatives | Rationale |
|---|---|---|---|
| `extractPlan` LLM | **`claude-haiku-4-5`** (via `@ai-sdk/anthropic`) | `claude-sonnet-5` (auto-escalate for confidence < 0.6 re-parse); OpenAI `gpt-4o-mini`/`gpt-4o` class; **YandexGPT** (`llm.api.cloud.yandex.net/v1`, OpenAI-compatible — RU residency); **GigaChat** (via `gpt2giga` OpenAI-compat proxy or native REST); **self-hosted** Qwen2.5-32B-Instruct / YandexGPT-OSS-class on vLLM behind `@ai-sdk/openai-compatible` | Haiku 4.5 is strong at instruction-following + Russian, 200K context (fits the catalog), cheapest Anthropic tier. Sonnet 5 only where it earns its 2x cost. For a sovereignty mandate, flip the default env to YandexGPT or self-hosted with **zero code change** — the point of the abstraction. |
| `transcribe` STT | **Groq `whisper-large-v3-turbo`** for dev/demo | **Yandex SpeechKit v3** (RU-tuned, residency, on-prem); **SaluteSpeech** (Sber, OGG_OPUS, OAuth `SALUTE_SPEECH_PERS`); **OpenAI `gpt-4o-transcribe`**; **self-hosted faster-whisper large-v3** (OpenAI-compatible server) | Groq: near-free, fastest, one REST call — perfect for demos. Production RU-gov: SpeechKit (managed, residency, or fully on-prem) or self-hosted faster-whisper on a single RTX-4070-class GPU (~12x realtime, large-v3 int8, ~2.5 GB VRAM). whisper.cpp only if CPU-only / Apple-silicon / tiny footprint. |

**Sovereignty profile (Moscow city government):** `AI_LLM_PROVIDER=yandexgpt` (or `selfhosted`) + `AI_STT_PROVIDER=yandex-speechkit` (or `selfhosted-whisper`). Both Yandex services offer on-prem/hybrid model deployment; the self-hosted pair needs one GPU box and no external egress. No code change — only env.

---

## Vercel serverless constraints (explicit)

| Constraint | Value (2026) | Consequence for this milestone |
|---|---|---|
| Request **and** response body cap | **4.5 MB** hard (`413 FUNCTION_PAYLOAD_TOO_LARGE`) | Audio and Excel files **must not** transit a function body. Browser uploads straight to Supabase Storage via signed URL; the function receives only the storage path and reads server-side. A 60 s WebM/Opus voice note ≈ 0.5–1 MB (would fit) but a 10-min dictation or a 5 MB `.xlsx` would not — so route everything through Storage for consistency. |
| `maxDuration` | Default ~300 s; **Pro up to 800 s GA**, 1800 s beta; set via `export const maxDuration = N` per route | Extraction with a repair retry: set `maxDuration = 60`. Excel import of a big Годовой план: `maxDuration = 120–300`. Long-audio async STT: don't block the function — kick off the provider's async job, return, poll/webhook. |
| Runtime | Node vs Edge | **Node.js runtime everywhere.** SheetJS needs Node APIs; longer `maxDuration` is Node/Python-only; AI SDK streaming works fine on Node. Edge buys nothing here and breaks `xlsx`. |
| Streaming responses | Supported on Node runtime | Stream `extractPlan` results into the предпросмотр UI (`streamText` / `toDataStreamResponse`) so the dispatcher sees rows appear. STT is request/response (no stream needed for short clips). |
| Fluid compute + Active CPU pricing | Billed **only during active CPU** ($0.128/CPU-hr), **not during I/O wait**; + provisioned memory $0.0106/GB-hr | A function that spends 8 s waiting on Claude/SpeechKit and 200 ms processing is billed ~200 ms of CPU. Makes the "thin function that awaits a provider" pattern very cheap. Keep functions I/O-bound, no busy loops. |
| Cold start | Node function cold start ~100–300 ms + `xlsx`/`ai` require cost | Acceptable for a human-in-the-loop tool. Don't bundle `xlsx` into a route that doesn't need it. |

### Estimated cost per 1,000 operations

| Operation | Assumptions | Cost |
|---|---|---|
| 1,000 plan extractions — Haiku 4.5 | ~1.5K input + ~0.6K output tokens/parse, no caching | ~**$4.50** |
| …same, with prompt caching on catalog+system prefix | cached prefix ~0.1x | ~**$1–2** |
| 1,000 extractions — Sonnet 5 | same tokens | ~**$9–11** |
| 1,000 transcriptions — Groq turbo | 30 s avg clip | ~**$0.30** |
| 1,000 transcriptions — OpenAI `gpt-4o-transcribe` | 30 s avg, $0.006/min | ~**$3** |
| 1,000 transcriptions — Yandex SpeechKit | 30 s, 15 s min billing, tiered | ~**150–450 ₽** |
| Vercel compute for the above | I/O-bound, Active-CPU billing | negligible (cents) |

At realistic dispatcher volume (tens of dictations/day) this is a rounding error. Cost is not a decision driver; **RU accuracy, data residency, and the abstraction cleanliness are.**

---

## Data flow (audio + Excel)

**Voice → plan drafts:**
1. Browser: `getUserMedia` → `MediaRecorder` → `audio/webm;codecs=opus` Blob.
2. Browser: request a signed upload URL (via `/api/db` RPC), `PUT` blob to Supabase Storage `voice/` bucket.
3. Browser: call `/api/ai/transcribe` with `{ storagePath }` (tiny JSON body).
4. Function (Node, `maxDuration=60`): downloads blob from Storage server-side → `transcribe` adapter → provider → text.
5. Function: `extractPlan({ text, catalogContext })` → guardrails → `PlanRow[]` → **stream** to client предпросмотр.
6. Human edits → "Создать черновики" → writes `daily_plan_items` (unpublished) via existing `/api/db` path.
7. Blob deleted (or 24 h TTL for correction/training).

**Excel → catalog staging:**
1. ADMIN uploads `.xls`/`.xlsx` → signed URL → Supabase Storage `imports/`.
2. `/api/import/xls` (Node, `maxDuration=120–300`): read from Storage → `XLSX.read(buf,{type:'buffer', cellDates:true})` → classify sheets (Титул / Конструктив / Годовой план) → normalise rows → write to `import_staging` table.
3. UI renders diff (staging vs live catalog) → ADMIN confirms → merge into `objects` / `constructions` / `work_types` / aliases.

**New API routes:** the app currently has one `/api/db` RPC envelope + `/api/auth`. AI features need streaming + a different payload shape, so add thin route handlers — `/api/ai/transcribe`, `/api/ai/extract`, `/api/import/xls` — each reusing `session-token.ts` cookie verification and role-gating (ADMIN for import; DISPATCHER/BOSS/ADMIN for dictation). Do **not** try to force streaming SSE + binary handoff through the `{fn,args}` RPC.

---

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Own thin `AiProvider` interface | LangChain.js / LlamaIndex.TS | Never for this. Two methods, one prompt, one schema — a framework adds 30+ transitive deps, its own abstractions, and lock-in, to solve a problem that's ~150 LOC. |
| Vercel AI SDK **v5** (pinned) | AI SDK v7 (latest) | Greenfield side-projects that will track head. Here, stability > newest; the custom interface already insulates you, so pin low and upgrade deliberately. |
| Prompt-JSON + Zod validation | `generateObject` / provider constrained decoding | If you ever drop to **only** Anthropic + OpenAI (both have reliable native structured output) and abandon the Yandex/GigaChat/self-hosted requirement. As long as 4 heterogeneous backends are in scope, uniform prompt-JSON wins. |
| SheetJS `xlsx` (CDN 0.20.3) | `exceljs` 4.4.0 | `.xlsx`-only pipelines with heavy cell formatting/streaming needs. Cannot read `.xls` — disqualified here. |
| SheetJS `xlsx` (CDN 0.20.3) | `node-xlsx` 0.24.0 | Never directly — it's a thin wrapper *over* SheetJS and lags versions. Use SheetJS itself. |
| Groq / SpeechKit hosted STT | Self-hosted faster-whisper | Hard data-residency mandate with no approved cloud, or high sustained volume where a GPU box amortises. Needs ops: GPU, `faster-whisper-server`, monitoring. |
| Anthropic `claude-haiku-4-5` default | YandexGPT / GigaChat default | Russian-sovereignty procurement requirement — flip the env var. Expect to re-tune the prompt and re-check `PlanRow` accuracy per provider. |
| Supabase Storage for audio | Direct browser → provider upload | A provider with a browser-safe signed-upload flow *and* no key exposure. Most STT APIs need a server-side key, so Storage-relay is the safe default; it also gives you the blob for the correction/training loop. |
| MediaRecorder (native) | `RecordRTC`, `wavesurfer.js` record plugin | Only if you need waveform visualisation or cross-browser WAV. Adds bundle weight to the client — avoid unless UX demands it. |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `npm install xlsx` (registry) | Frozen at 0.18.5, 4 years stale; prototype-pollution + ReDoS CVEs patched only in ≥0.19.3 / ≥0.20.2; misses format fixes | `npm install https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz` |
| LangChain / LlamaIndex / CrewAI / AutoGen / any "agent framework" | Massive dep surface, leaky abstractions, provider lock-in dressed as portability; this is one extraction call, not an agent loop | Own `AiProvider` interface + AI SDK in adapters |
| Client-side LLM/STT calls (`NEXT_PUBLIC_*` keys, browser → OpenAI/Anthropic) | Leaks API keys to every user; uncontrollable spend; no guardrail enforcement | All model calls in Node route handlers behind the `gormost_token` cookie |
| AI SDK `generateObject` on `@ai-sdk/openai-compatible` | Structured-output param not sent correctly (vercel/ai #8427, open); silent schema drift on Yandex/GigaChat/self-hosted | `generateText` + prompt-JSON + Zod `safeParse` + repair retry, uniformly |
| Edge runtime for AI/import routes | `xlsx` needs Node APIs; `maxDuration` > 25 s is Node-only; no upside here | `export const runtime = 'nodejs'` |
| POSTing audio / Excel through a Vercel function body | 4.5 MB hard cap → `413`; also counts against response cap | Browser → Supabase Storage signed URL → function reads server-side |
| `ffmpeg.wasm` / client-side transcode | 25+ MB WASM payload, slow; unnecessary — Opus/WebM & mp4 are accepted by Groq/OpenAI/SaluteSpeech directly | Send the `MediaRecorder` blob as-is; let the provider handle the container |
| Whisper WASM / transformers.js in the browser | Hundreds of MB of model download, poor mobile perf, no RU tuning control | Server-side STT (hosted or self-hosted) |
| A vector DB / RAG stack for the catalog | The participok vocabulary is small and controlled; embeddings add infra + nondeterminism | Inject catalog as prompt context; `pg_trgm` for fuzzy alias lookup in Postgres |
| Multi-turn "agent" loop for extraction | Turns a deterministic transform into an unpredictable, expensive, hard-to-test conversation | Single call, `safeParse`, one bounded repair retry |
| Unpinned `ai` dependency (`^5` or `latest`) | v5→v6→v7 shipped within ~a year; a `^` bump can change the API under you | Exact pin (`"ai": "5.0.250"`), upgrade as a deliberate task |
| Mixing `@anthropic-ai/sdk` **and** `@ai-sdk/anthropic` for the same adapter | Two Anthropic code paths to maintain and test | Pick one per adapter |

---

## Stack Patterns by Variant

**If the deployment stays on Vercel + hosted providers (demo / near-term):**
- `AI_LLM_PROVIDER=anthropic` (`claude-haiku-4-5`), `AI_STT_PROVIDER=groq`.
- AI SDK v5 for both LLM adapters; raw `fetch` for Groq is also fine.
- Prompt caching on the Anthropic catalog prefix to cut extraction cost ~3–4x.

**If a Russian-data-sovereignty requirement lands:**
- `AI_LLM_PROVIDER=yandexgpt` (OpenAI-compatible endpoint via `@ai-sdk/openai-compatible`) **or** `selfhosted`.
- `AI_STT_PROVIDER=yandex-speechkit` **or** `selfhosted-whisper`.
- No code change beyond writing the two adapters up front. Re-run the `PlanRow` accuracy eval per provider — Russian extraction quality differs.
- If fully air-gapped: self-hosted vLLM (Qwen2.5-class) + `faster-whisper-server`, both OpenAI-compatible, one GPU host, adapters point at internal base URLs.

**If Excel files routinely exceed a few MB or have 10k+ rows:**
- Bump `/api/import/xls` to `maxDuration = 300`.
- Parse with `XLSX.read(buf, { dense: true })` and stream staging inserts in batches.
- Consider a Supabase Edge Function (Deno) or a queue if it outgrows a 300 s Vercel function — but that's a later-milestone concern.

**If browser target includes iPad Safari and the chosen STT rejects `audio/mp4`:**
- Add `extendable-media-recorder` + `-wav-encoder` to force PCM/WAV client-side.
- Otherwise skip — Groq / OpenAI / SSpeechKit accept Safari's output.

---

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| `ai@5.0.x` | `react@19`, `next@16`, `zod@4` | v5+ is the first line with full React 19 / Next 16 support. Zod 4 schemas accepted directly. |
| `@ai-sdk/anthropic@4` / `@ai-sdk/openai@4` / `@ai-sdk/openai-compatible@3` | `ai@5.0.x` | Provider packages version independently from `ai`; the 4.x / 3.x lines pair with `ai@5`. Verify peer ranges at install. |
| `xlsx@0.20.3` (SheetJS CDN) | Node 18/20/22, Vercel Node runtime | Pure JS, no native addons. `{type:'buffer'}` read path is server-only. Do not import in client components. |
| `zod@4.5.4` | `ai@5`, TypeScript 5.9 (project uses 5.9.3) | `z.toJSONSchema()` is built in — no `zod-to-json-schema`. |
| `@ai-sdk/groq@4` | `ai@5.0.x` | Only needed if using the AI SDK wrapper for Groq STT; raw REST avoids the dep. |
| Vercel `maxDuration > 300` | Node runtime, Pro/Enterprise plan, specific Node versions | 800 s GA, 1800 s beta — needs per-function `maxDuration` export. |

---

## Sources

- npm registry (`npm view` on 2026-09-01) — verified: `ai` 7.0.87 (dist-tags `ai-v5` 5.0.250, `ai-v6` 6.0.273), `@ai-sdk/openai` 4.0.53, `@ai-sdk/anthropic` 4.0.46, `@ai-sdk/openai-compatible` 3.0.41, `@ai-sdk/groq` 4.0.35, `zod` 4.5.4, `exceljs` 4.4.0, `xlsx` (registry) 0.18.5, `groq-sdk` 1.6.0 — HIGH
- claude-api skill (cached 2026-06-24) — Anthropic model IDs + pricing: `claude-haiku-4-5` $1/$5, `claude-sonnet-5` $2/$10, 200K/1M context — HIGH
- vercel.com/docs/functions/limitations, /configuring-functions/duration, /docs/functions/usage-and-pricing, changelog "run up to 30 minutes", blog "Active CPU pricing for Fluid compute" — 4.5 MB body cap, maxDuration 800s/1800s, Active CPU $0.128/hr, memory $0.0106/GB-hr — MEDIUM (web search, not direct fetch)
- SheetJS docs (docs.sheetjs.com/docs/getting-started/installation/nodejs, git.sheetjs.com issue #3069), npm advisories — CDN 0.20.3 is current, npm stuck at 0.18.5, `.xls` BIFF support, exceljs xls limitation (github.com/exceljs/exceljs#2692) — MEDIUM
- aistudio.yandex.ru/docs/en/speechkit/pricing, yandex.cloud/en/services/speechkit — SpeechKit v3 modes, RU/EN/TR, per-second billing 15s min, on-prem/hybrid deployment offered — MEDIUM
- developers.sber.ru/docs/ru/salutespeech, geoscout.pro/gigachat-api-instrukciya, tokenmix.ai GigaChat guide, github.com/ai-forever/gpt2giga — SaluteSpeech vs GigaChat separate OAuth scopes, OpenAI-compat proxy exists, 2026-07-15 Freemium change — MEDIUM
- northflank.com "best open source STT 2026", promptquorum.com whisper.cpp vs faster-whisper 2026, github.com/SYSTRAN/faster-whisper #1030 — faster-whisper ~12x realtime large-v3 int8 RTX4070, whisper.cpp for CPU/Apple, RU is high-resource for Whisper — LOW (no canonical RU WER figure found)
- diyai.io / costgoat.com OpenAI transcription pricing, console.groq.com/docs/model/whisper-large-v3-turbo, eesel.ai Groq pricing — gpt-4o-transcribe ~$0.006/min, Groq turbo ~$0.04/hr @ ~200x realtime — MEDIUM
- ai-sdk.dev providers/openai-compatible-providers, github.com/vercel/ai issues #5197 & #8427 — generateObject unreliable on openai-compatible, structured-output param bug open Sep 2025 — MEDIUM
- github.com/sazonovanton/YandexGPT_to_OpenAI, github.com/ai-forever/gpt2giga — YandexGPT & GigaChat reachable via OpenAI-compatible surfaces (native Yandex Foundation Models `/v1` endpoint also exists) — MEDIUM
- MDN MediaRecorder / getUserMedia — `audio/webm;codecs=opus` (Chrome/FF/Edge), `audio/mp4` (Safari 14.1+), accepted by Groq/OpenAI/SaluteSpeech without transcode — MEDIUM

---
*Stack research for: AI work-planner (RU STT + LLM structured extraction) on Next.js 16 / Supabase / Vercel*
*Researched: 2026-09-01*
