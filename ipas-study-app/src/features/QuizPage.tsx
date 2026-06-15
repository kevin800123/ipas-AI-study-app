import { useMemo, useState } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import type { OptionKey, QuizMode } from '../types'
import { getSubject, getQuestions } from '../data/subjects'
import { takeQuestions, shuffleOptions } from '../lib/quizBuilder'
import { questionsByTag } from '../lib/weakness'
import { scoreQuiz } from '../lib/scoreQuiz'
import { recordQuiz, addWrongQuestions } from '../store/progress'

export function QuizPage() {
  const { subjectId = '', mode = 'practice' } = useParams()
  const [params] = useSearchParams()
  const tag = params.get('tag') ?? ''
  const quizMode = (mode === 'mock' ? 'mock' : 'practice') as QuizMode
  const navigate = useNavigate()
  const subject = getSubject(subjectId)
  const questions = useMemo(() => {
    let pool = getQuestions(subjectId)
    if (tag) pool = questionsByTag(pool, tag)
    const n = quizMode === 'mock' ? (subject?.examFormat.questionCount ?? pool.length) : 10
    const picked = takeQuestions(pool, n)
    return quizMode === 'mock' ? picked.map((q) => shuffleOptions(q)) : picked
  }, [subjectId, quizMode, subject, tag])

  const [answers, setAnswers] = useState<Record<string, OptionKey | null>>({})
  const [revealed, setRevealed] = useState<Record<string, boolean>>({})

  if (!subject) return <p>找不到此科目。</p>

  function choose(qid: string, key: OptionKey) {
    setAnswers((a) => ({ ...a, [qid]: key }))
    if (quizMode === 'practice') setRevealed((r) => ({ ...r, [qid]: true }))
  }

  function submit() {
    const result = scoreQuiz(questions, answers, subject!.examFormat)
    const wrong = result.details.filter((d) => !d.isCorrect).map((d) => d.questionId)
    addWrongQuestions(subjectId, wrong)
    recordQuiz(subjectId, {
      date: new Date().toISOString().slice(0, 10),
      mode: quizMode, score: result.score, correct: result.correct, total: result.total,
    })
    // store the rendered questions + answers so the result page can show a full
    // review with explanations (option order may be shuffled in mock mode).
    sessionStorage.setItem('lastResult', JSON.stringify({ subjectId, mode: quizMode, result, questions, answers }))
    navigate(`/subject/${subjectId}/result`)
  }

  return (
    <div className="space-y-6">
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
      <button onClick={submit} className="w-full bg-sky-600 text-white rounded py-2 text-sm">交卷計分</button>
    </div>
  )
}
