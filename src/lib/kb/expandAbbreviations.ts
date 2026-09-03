// Curated in-code abbreviation dictionary + expander (D-10).
// A separate function from normalize() so it is tested and grown independently
// (Phase 13 correction-learning feeds it). This slice seeds only the handful of
// entries its fixtures exercise; Plan 08-03 grows the dictionary.
//
// Runs BEFORE normalize() in the pipeline (D-09), so keys may still contain
// punctuation / mixed case. Matching is whitespace-token-wise and
// case-insensitive; whitespace is preserved so normalize() can collapse it.

const ABBREVIATIONS: Record<string, string> = {
  'борт.': 'бортовой',
  'ж/б': 'железобетонный',
  'п/п': 'пешеходный переход',
  'эв': 'эвакуационный выход',
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
