import type { Question } from '../types'

export interface TagStat {
  tag: string
  wrong: number
  total: number
}

const GENERIC = '綜合應用'

function tagsOf(q: Question): string[] {
  return q.tags.length ? q.tags : [GENERIC]
}

/**
 * Weak topics for a subject: for every tag that has at least one wrong question,
 * report how many of that tag's questions the user got wrong vs how many exist.
 * Sorted by wrong count, then by wrong ratio, so the weakest topic comes first.
 */
export function tagStats(questions: Question[], wrongIds: string[]): TagStat[] {
  const wrong = new Set(wrongIds)
  const total: Record<string, number> = {}
  const wrongCount: Record<string, number> = {}
  for (const q of questions) {
    const isWrong = wrong.has(q.id)
    for (const t of tagsOf(q)) {
      total[t] = (total[t] ?? 0) + 1
      if (isWrong) wrongCount[t] = (wrongCount[t] ?? 0) + 1
    }
  }
  return Object.keys(wrongCount)
    .map((tag) => ({ tag, wrong: wrongCount[tag], total: total[tag] }))
    .sort((a, b) => b.wrong - a.wrong || b.wrong / b.total - a.wrong / a.total)
}

export function questionsByTag(questions: Question[], tag: string): Question[] {
  return questions.filter((q) => tagsOf(q).includes(tag))
}
