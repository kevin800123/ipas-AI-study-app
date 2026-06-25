import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { Level } from '../types'
import { listSubjects, allSubjects, getSummaries, getQuestions } from '../data/subjects'
import { getSubjectProgress } from '../store/progress'
import { aggregate } from '../lib/stats'
import { useViewMode } from '../store/viewMode'
import { ProgressBar } from '../components/ProgressBar'

export function HomePage() {
  const [level, setLevel] = useState<Level>('beginner')
  const web = useViewMode() === 'web'
  const subjects = listSubjects(level)
  const stats = aggregate(allSubjects().map((s) => getSubjectProgress(s.id).quizHistory))
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-medium">iPAS 備考</h1>

      {stats.attempts > 0 ? (
        <div className="grid grid-cols-4 gap-2 text-center">
          <div className="border rounded-lg p-3">
            <div className="text-2xl font-semibold text-amber-600">{stats.streak}</div>
            <div className="text-[0.7rem] text-gray-500 mt-0.5">🔥 連續天數</div>
          </div>
          <div className="border rounded-lg p-3">
            <div className="text-2xl font-semibold text-sky-700">{stats.answered}</div>
            <div className="text-[0.7rem] text-gray-500 mt-0.5">累計做題</div>
          </div>
          <div className="border rounded-lg p-3">
            <div className="text-2xl font-semibold text-green-700">{Math.round(stats.accuracy * 100)}%</div>
            <div className="text-[0.7rem] text-gray-500 mt-0.5">平均正確率</div>
          </div>
          <div className="border rounded-lg p-3">
            <div className="text-2xl font-semibold text-gray-700">{stats.attempts}</div>
            <div className="text-[0.7rem] text-gray-500 mt-0.5">測驗次數</div>
          </div>
        </div>
      ) : (
        <p className="text-sm text-gray-500 border rounded-lg p-3">還沒有測驗紀錄 —— 做一次練習或模擬考，這裡就會出現你的連續學習天數 🔥、累計做題數與正確率。</p>
      )}
      <div className="flex gap-2">
        <button onClick={() => setLevel('beginner')}
          className={`px-3 py-1 rounded text-sm ${level === 'beginner' ? 'bg-sky-100 text-sky-700' : 'border text-gray-500'}`}>初級</button>
        <button onClick={() => setLevel('intermediate')}
          className={`px-3 py-1 rounded text-sm ${level === 'intermediate' ? 'bg-sky-100 text-sky-700' : 'border text-gray-500'}`}>中級</button>
      </div>
      {level === 'intermediate' && subjects.length > 0 && (
        <p className="text-xs text-gray-500">中級需應考科目一，再加考科目二或科目三。</p>
      )}
      {subjects.length === 0 && <p className="text-gray-500 text-sm">此級別尚未上架。</p>}
      <div className={web ? 'grid sm:grid-cols-2 lg:grid-cols-3 gap-3' : 'space-y-4'}>
        {subjects.map((s) => {
          const total = getSummaries(s.id).length
          const read = getSubjectProgress(s.id).summariesRead.length
          const ratio = total ? read / total : 0
          const last = getSubjectProgress(s.id).quizHistory[0]
          const qCount = getQuestions(s.id).length
          return (
            <Link key={s.id} to={`/subject/${s.id}`} className="block border rounded-lg p-4 space-y-2 hover:border-sky-300">
              <div className="font-medium">{s.title}</div>
              <ProgressBar value={ratio} />
              <div className="text-xs text-gray-500">
                摘要進度 {Math.round(ratio * 100)}%・題庫 {qCount} 題{last ? `　最近成績 ${last.score} 分` : ''}
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
