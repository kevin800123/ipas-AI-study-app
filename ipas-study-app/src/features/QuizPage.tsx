import { useMemo, useState, useEffect } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import type { OptionKey, QuizMode } from '../types'
import { getSubject, getQuestions } from '../data/subjects'
import { takeQuestions, shuffleOptions } from '../lib/quizBuilder'
import { questionsByTag } from '../lib/weakness'
import { scoreQuiz } from '../lib/scoreQuiz'
import { recordQuiz, addWrongQuestions } from '../store/progress'

function fmt(sec: number) {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

export function QuizPage() {
  const { subjectId = '', mode = 'practice' } = useParams()
  const [params] = useSearchParams()
  const tag = params.get('tag') ?? ''
  const quizMode = (mode === 'mock' ? 'mock' : 'practice') as QuizMode
  const navigate = useNavigate()
  const subject = getSubject(subjectId)

  // practice starts immediately with 10; mock waits for the user to pick a count.
  const [count, setCount] = useState<number | null>(quizMode === 'mock' ? null : 10)
  const [answers, setAnswers] = useState<Record<string, OptionKey | null>>({})
  const [revealed, setRevealed] = useState<Record<string, boolean>>({})
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null)
  const [done, setDone] = useState(false)

  const questions = useMemo(() => {
    if (count === null) return []
    let pool = getQuestions(subjectId)
    if (tag) pool = questionsByTag(pool, tag)
    const picked = takeQuestions(pool, count)
    return quizMode === 'mock' ? picked.map((q) => shuffleOptions(q)) : picked
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subjectId, quizMode, count, tag])

  function submit() {
    if (done) return
    setDone(true)
    const result = scoreQuiz(questions, answers, subject!.examFormat)
    addWrongQuestions(subjectId, result.details.filter((d) => !d.isCorrect).map((d) => d.questionId))
    recordQuiz(subjectId, {
      date: new Date().toISOString().slice(0, 10),
      mode: quizMode, score: result.score, correct: result.correct, total: result.total,
    })
    sessionStorage.setItem('lastResult', JSON.stringify({ subjectId, mode: quizMode, result, questions, answers }))
    navigate(`/subject/${subjectId}/result`)
  }

  // countdown for mock
  useEffect(() => {
    if (secondsLeft === null) return
    if (secondsLeft <= 0) { submit(); return }
    const t = setTimeout(() => setSecondsLeft((s) => (s ?? 0) - 1), 1000)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsLeft])

  if (!subject) return <p>找不到此科目。</p>

  // ---- mock setup screen ----
  if (quizMode === 'mock' && count === null) {
    const pool = tag ? questionsByTag(getQuestions(subjectId), tag) : getQuestions(subjectId)
    const perQ = subject.examFormat.minutes / subject.examFormat.questionCount
    const opts = [...new Set([10, 20, 30, subject.examFormat.questionCount])]
      .filter((n) => n <= pool.length).sort((a, b) => a - b)
    function start(n: number) {
      setSecondsLeft(Math.round(n * perQ * 60))
      setCount(n)
    }
    return (
      <div className="space-y-5 max-w-md">
        <h1 className="text-lg font-medium">{subject.title}・模擬考</h1>
        <p className="text-sm text-gray-500">選擇題數，系統會依正式考試節奏（每題約 {perQ.toFixed(1)} 分鐘）倒數計時，時間到自動交卷。本科題庫共 {pool.length} 題。</p>
        <div className="grid grid-cols-2 gap-3">
          {opts.map((n) => (
            <button key={n} onClick={() => start(n)}
              className="border rounded-lg p-4 text-left hover:border-sky-400">
              <div className="text-xl font-semibold">{n} 題{n === subject.examFormat.questionCount ? '（正式題數）' : ''}</div>
              <div className="text-xs text-gray-500 mt-1">約 {Math.round(n * perQ)} 分鐘</div>
            </button>
          ))}
        </div>
      </div>
    )
  }

  function choose(qid: string, key: OptionKey) {
    if (done) return
    setAnswers((a) => ({ ...a, [qid]: key }))
    if (quizMode === 'practice') setRevealed((r) => ({ ...r, [qid]: true }))
  }

  const lowTime = secondsLeft !== null && secondsLeft <= 60
  const answeredCount = questions.filter((q) => answers[q.id]).length

  return (
    <div className="space-y-6">
      {quizMode === 'mock' && secondsLeft !== null && (
        <div className={`sticky top-0 md:top-0 z-10 -mx-4 px-4 py-2 flex items-center justify-between text-sm border-b ${lowTime ? 'bg-red-50 text-red-700' : 'bg-white'}`}>
          <span>已作答 {answeredCount} / {questions.length}</span>
          <span className={`font-mono font-semibold ${lowTime ? 'text-red-700' : 'text-sky-700'}`}>⏱ {fmt(secondsLeft)}</span>
        </div>
      )}
      <h1 className="text-lg font-medium">{subject.title}・{quizMode === 'mock' ? '模擬考' : '練習'}{tag && `・${tag}`}</h1>
      {quizMode === 'practice' && (
        <p className="text-xs text-gray-500">
          {tag ? `弱點章節練習：${tag}。` : '練習模式：'}作答後立即顯示正解與詳解。
        </p>
      )}
      {questions.length === 0 && <p className="text-sm text-gray-500">此章節暫無可練習的題目。</p>}
      {questions.map((q, idx) => (
        <div key={q.id} className="border rounded-lg p-4 space-y-2">
          <div className="text-sm font-medium">{idx + 1}. {q.stem}</div>
          {q.options.map((o) => {
            const picked = answers[q.id] === o.key
            const show = revealed[q.id]
            const isAns = o.key === q.answer
            const cls = show
              ? isAns ? 'border-green-500 bg-green-50' : picked ? 'border-red-400 bg-red-50' : 'border-gray-200'
              : picked ? 'border-sky-500 bg-sky-50' : 'border-gray-200'
            return (
              <button key={o.key} onClick={() => choose(q.id, o.key)}
                className={`block w-full text-left border rounded p-2 text-sm ${cls}`}>
                ({o.key}) {o.text}
              </button>
            )
          })}
          {revealed[q.id] && (
            <div className="rounded bg-gray-50 border border-gray-100 p-2 space-y-1">
              <div className="text-xs font-medium text-green-700">正解：({q.answer})</div>
              <p className="text-xs text-gray-600 leading-relaxed">
                <span className="text-gray-400">詳解：</span>
                {q.explanation || '詳解整理中，敬請期待。'}
              </p>
            </div>
          )}
        </div>
      ))}
      {questions.length > 0 && (
        <button onClick={submit} className="w-full bg-sky-600 text-white rounded py-2 text-sm">交卷計分</button>
      )}
    </div>
  )
}
