export type Level = 'beginner' | 'intermediate'
export type OptionKey = 'A' | 'B' | 'C' | 'D'

export interface Option { key: OptionKey; text: string }

export interface Question {
  id: string
  level: Level
  subject: string
  source: string
  stem: string
  options: Option[]
  answer: OptionKey
  explanation?: string
  tags: string[]
}

export interface ExamFormat {
  questionCount: number
  minutes: number
  passScore: number
  pointsPerQuestion: number
}

export interface TopicWeight { tag: string; weight: number }

export interface Subject {
  id: string
  level: Level
  title: string
  examFormat: ExamFormat
  topics: TopicWeight[]
}

export type SummaryBlock =
  | { type: 'text'; content: string }
  | { type: 'heading'; text: string }
  | { type: 'keypoints'; items: string[] }
  | { type: 'table'; headers: string[]; rows: string[][] }
  | { type: 'image'; svg: string; caption?: string }

export interface SummaryChapter {
  id: string
  subject: string
  chapter: number
  title: string
  blocks: SummaryBlock[]
}

export type QuizMode = 'practice' | 'mock'

export interface QuizResultDetail {
  questionId: string
  selected: OptionKey | null
  correct: OptionKey
  isCorrect: boolean
}

export interface QuizResult {
  score: number
  correct: number
  total: number
  pass: boolean
  details: QuizResultDetail[]
}

export interface QuizHistoryEntry {
  date: string
  mode: QuizMode
  score: number
  correct: number
  total: number
}

export interface SubjectProgress {
  summariesRead: string[]
  quizHistory: QuizHistoryEntry[]
  wrongQuestions: string[]
  bookmarks: string[]
}

export interface ProgressState {
  version: number
  subjects: Record<string, SubjectProgress>
}
