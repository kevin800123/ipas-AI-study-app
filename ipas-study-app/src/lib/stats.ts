import type { QuizHistoryEntry } from '../types'

export interface OverallStats {
  attempts: number
  answered: number
  correct: number
  accuracy: number
  studyDays: number
  streak: number
}

const dayKey = (d: Date) => d.toISOString().slice(0, 10)

/** Consecutive study days ending today (or yesterday, so it doesn't break until a full day passes). */
export function computeStreak(dates: Set<string>, today = new Date()): number {
  if (!dates.size) return 0
  const cursor = new Date(today)
  if (!dates.has(dayKey(cursor))) {
    cursor.setDate(cursor.getDate() - 1)
    if (!dates.has(dayKey(cursor))) return 0
  }
  let streak = 0
  while (dates.has(dayKey(cursor))) {
    streak++
    cursor.setDate(cursor.getDate() - 1)
  }
  return streak
}

export function aggregate(histories: QuizHistoryEntry[][], today = new Date()): OverallStats {
  let attempts = 0, answered = 0, correct = 0
  const dates = new Set<string>()
  for (const hist of histories) {
    for (const h of hist) {
      attempts++
      answered += h.total
      correct += h.correct
      dates.add(h.date)
    }
  }
  return {
    attempts,
    answered,
    correct,
    accuracy: answered ? correct / answered : 0,
    studyDays: dates.size,
    streak: computeStreak(dates, today),
  }
}
