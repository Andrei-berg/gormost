// D-12a fixture gate — real «вариант → каноника» pairs: declensions, abbreviation
// expansions, prepositional phrases. Sourced from 08-CONTEXT.md D-12a and
// 08-RESEARCH.md § "Pitfall 2" (лN 416-421). Consumed by ../lemmatize.test.ts,
// which is a mandatory `npm run test` case — every lemmatize implementation,
// vendored or spiked, must pass it.
//
// `viaPreprocess: true` marks pairs whose variant carries an abbreviation or a №
// marker: those run through the full preprocess() path
// (expandAbbreviations → normalize → lemmatize) and are compared as lemma
// sequences. The rest are compared as lemma sets with prepositions/particles
// dropped (Russian reorders words freely; the D-12a property is "same lemmas").
//
// Note on «камень»: the bare nominative keeps its fleeting vowel under any Porter
// stemmer («камень» → камен, «камня» → камн). Oblique forms all collapse to
// «камн», so the бортовой-камень declension pairs below pair oblique with oblique;
// the nominative is covered through the «борт. камень» abbreviation pair.

export interface LemmaCase {
  variant: string
  canonical: string
  note: string
  viaPreprocess?: boolean
}

export const lemmaCases: LemmaCase[] = [
  // --- Лефортовский тоннель: nominative / genitive / dative / prepositional ---
  { variant: 'Лефортовский тоннель', canonical: 'Лефортовский тоннель', note: 'nominative — identity' },
  { variant: 'Лефортовского тоннеля', canonical: 'Лефортовский тоннель', note: 'genitive' },
  { variant: 'Лефортовскому тоннелю', canonical: 'Лефортовский тоннель', note: 'dative' },
  { variant: 'Лефортовским тоннелем', canonical: 'Лефортовский тоннель', note: 'instrumental' },
  { variant: 'на Лефортовском тоннеле', canonical: 'Лефортовский тоннель', note: 'prepositional + preposition (D-12a)' },
  { variant: 'Лефортовские тоннели', canonical: 'Лефортовский тоннель', note: 'plural' },

  // --- Шереметьевский тоннель / портал ---
  { variant: 'Шереметьевский тоннель', canonical: 'Шереметьевский тоннель', note: 'nominative — identity' },
  { variant: 'Шереметьевского тоннеля', canonical: 'Шереметьевский тоннель', note: 'genitive' },
  { variant: 'на Шереметьевском тоннеле', canonical: 'Шереметьевский тоннель', note: 'prepositional' },
  { variant: 'у Шереметьевского портала', canonical: 'Шереметьевский портал', note: 'prepositional phrase (Pitfall 2)' },

  // --- бортовой камень: oblique forms share {бортов, камн} ---
  { variant: 'бортового камня', canonical: 'бортовому камню', note: 'genitive ⇔ dative (oblique)' },
  { variant: 'на бортовом камне', canonical: 'бортового камня', note: 'prepositional ⇔ genitive (oblique)' },
  { variant: 'бортовые камни', canonical: 'бортового камня', note: 'plural ⇔ singular oblique' },

  // --- эвакуационный выход: nominative / genitive / prepositional / plural ---
  { variant: 'эвакуационный выход', canonical: 'эвакуационный выход', note: 'nominative — identity' },
  { variant: 'эвакуационного выхода', canonical: 'эвакуационный выход', note: 'genitive' },
  { variant: 'эвакуационном выходе', canonical: 'эвакуационный выход', note: 'prepositional' },
  { variant: 'эвакуационные выходы', canonical: 'эвакуационный выход', note: 'plural' },

  // --- пешеходный переход: nominative / genitive / prepositional / plural ---
  { variant: 'пешеходный переход', canonical: 'пешеходный переход', note: 'nominative — identity' },
  { variant: 'пешеходного перехода', canonical: 'пешеходный переход', note: 'genitive' },
  { variant: 'пешеходном переходе', canonical: 'пешеходный переход', note: 'prepositional' },
  { variant: 'пешеходные переходы', canonical: 'пешеходный переход', note: 'plural' },

  // --- plural / singular of work-type nouns ---
  { variant: 'плиты', canonical: 'плита', note: 'work-type noun plural/singular (плита)' },
  { variant: 'стыки', canonical: 'стык', note: 'work-type noun plural/singular (стык)' },
  { variant: 'решётки', canonical: 'решётка', note: 'work-type noun plural/singular + ё-fold (решётка)' },
  { variant: 'ремонты', canonical: 'ремонт', note: 'work-type noun plural/singular (ремонт)' },
  { variant: 'работы', canonical: 'работа', note: 'work-type noun plural/singular (работа)' },

  // --- abbreviation-derived, via the full preprocess() path (D-09) ---
  { variant: 'борт. камень', canonical: 'бортовой камень', note: 'борт. → бортовой (expandAbbreviations)', viaPreprocess: true },
  { variant: 'борт. камня', canonical: 'бортового камня', note: 'борт. abbreviation + genitive noun', viaPreprocess: true },
  { variant: 'ЭВ №3', canonical: 'эвакуационный выход №3', note: 'ЭВ → эвакуационный выход (expandAbbreviations)', viaPreprocess: true },
]
