import { describe, it, expect } from 'vitest'
import { requiresWorkPermit, matchedHighRiskCategories } from './highRiskWorks'

describe('requiresWorkPermit (п.15 классификатор)', () => {
  it('flags welding works', () => {
    expect(requiresWorkPermit('Электрогазосварочные работы на портале')).toBe(true)
    expect(requiresWorkPermit('Сварка металлоконструкций')).toBe(true)
  })

  it('flags work on roadway', () => {
    expect(requiresWorkPermit('Замена камеры на проезжей части')).toBe(true)
    expect(requiresWorkPermit('Обслуживание эл. сетей на проезжей части с АГП')).toBe(true)
  })

  it('flags confined spaces (wells, collectors, tunnels)', () => {
    expect(requiresWorkPermit('Осмотр в колодце')).toBe(true)
    expect(requiresWorkPermit('Прочистка коллектора')).toBe(true)
  })

  it('flags height works (incl. АГП, кровля)', () => {
    expect(requiresWorkPermit('Работы на высоте более 1,8 м')).toBe(true)
    expect(requiresWorkPermit('Очистка крыши от снега')).toBe(true)
    expect(requiresWorkPermit('Замена светильника с люльки')).toBe(true)
  })

  it('flags earthworks and trenches', () => {
    expect(requiresWorkPermit('Рытьё траншеи под кабель')).toBe(true)
    expect(requiresWorkPermit('Земляные работы в зоне подземных коммуникаций')).toBe(true)
  })

  it('flags electrical installations / ЛЭП', () => {
    expect(requiresWorkPermit('Ремонт электроустановки в РУ')).toBe(true)
    expect(requiresWorkPermit('Работы вблизи ЛЭП')).toBe(true)
  })

  it('is case-insensitive and ё-insensitive', () => {
    expect(requiresWorkPermit('СВАРКА')).toBe(true)
    expect(requiresWorkPermit('Грузоподъёмный кран')).toBe(true)
  })

  it('does NOT flag ordinary low-risk works', () => {
    expect(requiresWorkPermit('Подметание тротуара')).toBe(false)
    expect(requiresWorkPermit('Замена бумаги в принтере')).toBe(false)
    expect(requiresWorkPermit('Осмотр документации')).toBe(false)
  })

  it('returns no categories for empty text', () => {
    expect(matchedHighRiskCategories('')).toEqual([])
    expect(requiresWorkPermit('   ')).toBe(false)
  })

  it('returns matched category labels', () => {
    const cats = matchedHighRiskCategories('Сварка на высоте')
    const ids = cats.map(c => c.id)
    expect(ids).toContain('welding')
    expect(ids).toContain('height')
  })
})
