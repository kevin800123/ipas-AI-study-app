import { describe, it, expect } from 'vitest'
import { computeStreak, aggregate } from './stats'
import type { QuizHistoryEntry } from '../types'

const h = (date: string, correct: number, total: number): QuizHistoryEntry =>
  ({ date, mode: 'practice', score: 0, correct, total })

describe('computeStreak', () => {
  const today = new Date('2026-06-25T00:00:00Z')
  it('counts consecutive days ending today', () => {
    expect(computeStreak(new Set(['2026-06-25', '2026-06-24', '2026-06-23']), today)).toBe(3)
  })
  it('allows ending yesterday', () => {
    expect(computeStreak(new Set(['2026-06-24', '2026-06-23']), today)).toBe(2)
  })
  it('breaks on a gap', () => {
    expect(computeStreak(new Set(['2026-06-25', '2026-06-23']), today)).toBe(1)
  })
  it('is 0 when last study is too old', () => {
    expect(computeStreak(new Set(['2026-06-20']), today)).toBe(0)
  })
  it('is 0 for no data', () => {
    expect(computeStreak(new Set(), today)).toBe(0)
  })
})

describe('aggregate', () => {
  it('sums answered/correct and computes accuracy', () => {
    const s = aggregate([[h('2026-06-25', 8, 10)], [h('2026-06-24', 6, 10)]], new Date('2026-06-25T00:00:00Z'))
    expect(s.attempts).toBe(2)
    expect(s.answered).toBe(20)
    expect(s.correct).toBe(14)
    expect(s.accuracy).toBeCloseTo(0.7)
    expect(s.studyDays).toBe(2)
    expect(s.streak).toBe(2)
  })
  it('handles empty', () => {
    const s = aggregate([])
    expect(s).toMatchObject({ attempts: 0, answered: 0, accuracy: 0, streak: 0 })
  })
})
