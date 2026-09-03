// Curated in-code abbreviation dictionary + expander (D-10).
//
// A SEPARATE function from normalize() so it is tested and grown independently.
// This dictionary is the growth point for Phase 13 correction-learning: when an
// operator corrects a mis-resolved dictation, a stable surface->expansion pair
// lands here. Irregular one-off surfaces («БК» for a specific bortcamень row,
// «тт №3 КТР» for one tunnel) do NOT belong here — they belong in the
// `entity_aliases` table, which is the primary mechanism for irregular cases
// (D-10, 08-RESEARCH.md § "Pitfall 2"). Only genuinely generic, site-wide
// abbreviations live in this constant.
//
// Runs BEFORE normalize() in the pipeline (D-09), so keys keep their raw
// punctuation (`борт.`, `ж/б`, `п/п`) — normalize() would otherwise strip the
// `.` and rewrite the `/`. Matching is whitespace-token-wise (a key only
// matches a whole space-delimited token, never a substring of a longer word —
// this is the T-08-10 "don't corrupt a real name" guarantee) and
// case-insensitive. Whitespace is preserved verbatim so normalize() can collapse
// it afterwards.
//
// Exact-token matching means longest-key-first ordering is automatic: `ттк` and
// `тт` are distinct keys and a token equals exactly one of them. If this ever
// moves to substring matching, longest-key-first must be made explicit.
//
// Keys are stored lower-cased (the lookup lower-cases the token); every
// expansion value is lower-cased too because the only pipeline consumer,
// preprocess(), lower-cases immediately via normalize().

export const ABBREVIATIONS: Record<string, string> = {
  // --- construction-material shorthands ---
  'борт.': 'бортовой',
  'ж/б': 'железобетонный',
  'а/б': 'асфальтобетонный',
  'м/к': 'металлоконструкция',
  // --- tunnel-infrastructure shorthands ---
  'эв': 'эвакуационный выход',
  'тт': 'транспортный тоннель',
  'п/п': 'пешеходный переход',
  'бк': 'бортовой камень',
  // --- Гормост-Лефортово site abbreviations (KB-05 scope). Expansions are
  //     starter values — refined via entity_aliases + the 08-07 seed migration
  //     (human-diffed) + Phase 13 correction learning. ---
  'зб': 'защитный блок',
  'лтр': 'лефортовский тоннель',
  'гтр': 'гагаринский тоннель',
  'ктр': 'кутузовский тоннель',
  'ттк': 'третье транспортное кольцо',
}

export function expandAbbreviations(input: string): string {
  return input
    .split(/(\s+)/) // keep whitespace groups as array elements
    .map((token) => {
      const key = token.toLowerCase()
      return Object.prototype.hasOwnProperty.call(ABBREVIATIONS, key) ? ABBREVIATIONS[key] : token
    })
    .join('')
}
