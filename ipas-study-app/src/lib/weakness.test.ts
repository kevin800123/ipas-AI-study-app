import { describe, it, expect } from 'vitest'
import { tagStats, questionsByTag } from './weakness'
import type { Question } from '../types'

const q = (id: string, tags: string[]): Question => ({
  id, level: 'intermediate', subject: 's', source: 'x', stem: 'q',
  options: [{ key: 'A', text: 'a' }, { key: 'B', text: 'b' }], answer: 'A', tags,
})

const pool = [q('1', ['NLP']), q('2', ['NLP']), q('3', ['CV']), q('4', ['CV']), q('5', [])]

describe('tagStats', () => {
  it('counts wrong vs total per tag and sorts weakest first', () => {
    const stats = tagStats(pool, ['1', '2', '3'])
    expect(stats[0]).toEqual({ tag: 'NLP', wrong: 2, total: 2 })
    expect(stats[1]).toEqual({ tag: 'CV', wrong: 1, total: 2 })
  })
  it('only includes tags with at least one wrong question', () => {
    expect(tagStats(pool, ['3']).map((s) => s.tag)).toEqual(['CV'])
  })
  it('falls back to 綜合應用 for untagged questions', () => {
    expect(tagStats(pool, ['5'])[0]).toEqual({ tag: '綜合應用', wrong: 1, total: 1 })
  })
  it('returns empty when nothing is wrong', () => {
    expect(tagStats(pool, [])).toEqual([])
  })
})

describe('questionsByTag', () => {
  it('filters by tag, treating untagged as 綜合應用', () => {
    expect(questionsByTag(pool, 'NLP').map((x) => x.id)).toEqual(['1', '2'])
    expect(questionsByTag(pool, '綜合應用').map((x) => x.id)).toEqual(['5'])
  })
})
