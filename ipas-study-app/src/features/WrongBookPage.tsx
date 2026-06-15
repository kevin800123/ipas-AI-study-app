import { useState, type ChangeEvent } from 'react'
import { Link } from 'react-router-dom'
import { allSubjects, getQuestions } from '../data/subjects'
import { tagStats } from '../lib/weakness'
import { getSubjectProgress, removeWrongQuestion, exportProgress, importProgress } from '../store/progress'

export function WrongBookPage() {
  const [, force] = useState(0)
  const subjects = allSubjects()

  function doExport() {
    const blob = new Blob([exportProgress()], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'ipas-progress.json'; a.click()
    URL.revokeObjectURL(url)
  }
  function doImport(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    file.text().then((t) => { importProgress(t); force((n) => n + 1) })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-medium">錯題本</h1>
        <div className="flex gap-2 text-sm">
          <button onClick={doExport} className="border rounded px-2 py-1">匯出</button>
          <label className="border rounded px-2 py-1 cursor-pointer">匯入
            <input type="file" accept="application/json" className="hidden" onChange={doImport} />
          </label>
        </div>
      </div>
      {subjects.map((s) => {
        const wrongList = getSubjectProgress(s.id).wrongQuestions
        const wrongIds = new Set(wrongList)
        const items = getQuestions(s.id).filter((q) => wrongIds.has(q.id))
        if (items.length === 0) return null
        const stats = tagStats(getQuestions(s.id), wrongList)
        const maxWrong = stats[0]?.wrong ?? 1
        return (
          <section key={s.id} className="space-y-2">
            <div className="text-sm font-medium">
              <span className="text-xs text-gray-400 mr-1">{s.level === 'intermediate' ? '中級' : '初級'}</span>
              {s.title}（{items.length}）
            </div>

            {stats.length > 0 && (
              <div className="rounded-lg border bg-gray-50 p-3 space-y-2">
                <div className="text-xs font-medium text-gray-600">弱點章節分析（依答錯題數排序）</div>
                {stats.map((st) => (
                  <div key={st.tag} className="flex items-center gap-2">
                    <span className="text-xs w-32 shrink-0 truncate">{st.tag}</span>
                    <div className="flex-1 h-2.5 rounded bg-gray-200 overflow-hidden">
                      <div className="h-full bg-red-400" style={{ width: `${Math.round((st.wrong / maxWrong) * 100)}%` }} />
                    </div>
                    <span className="text-xs text-gray-500 w-20 text-right shrink-0">錯 {st.wrong}／{st.total}</span>
                    <Link to={`/subject/${s.id}/quiz/practice?tag=${encodeURIComponent(st.tag)}`}
                      className="text-xs text-sky-700 whitespace-nowrap shrink-0">練習 ›</Link>
                  </div>
                ))}
              </div>
            )}

            {items.map((q) => (
              <div key={q.id} className="border rounded p-3 text-sm space-y-1">
                <div>{q.stem}</div>
                {q.tags.length > 0 && <div className="text-xs text-sky-600">#{q.tags.join(' #')}</div>}
                <div className="text-green-700 text-xs">正解：({q.answer}) {q.options.find((o) => o.key === q.answer)?.text}</div>
                <p className="text-xs text-gray-500 leading-relaxed">
                  <span className="text-gray-400">詳解：</span>
                  {q.explanation || '詳解整理中，敬請期待。'}
                </p>
                <button onClick={() => { removeWrongQuestion(s.id, q.id); force((n) => n + 1) }}
                  className="text-xs text-gray-400">移除</button>
              </div>
            ))}
          </section>
        )
      })}
      {subjects.every((s) => getSubjectProgress(s.id).wrongQuestions.length === 0) &&
        <p className="text-gray-500 text-sm">目前沒有錯題，去測驗看看吧。</p>}
    </div>
  )
}
