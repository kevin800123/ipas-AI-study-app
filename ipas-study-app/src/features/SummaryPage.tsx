import { useParams, Link } from 'react-router-dom'
import { useState } from 'react'
import { getSummaries } from '../data/subjects'
import { getSubjectProgress, toggleSummaryRead } from '../store/progress'
import { SummaryBlocks, isSectionHeading } from '../components/SummaryBlocks'

export function SummaryPage() {
  const { subjectId = '', chapterId = '' } = useParams()
  const chapter = getSummaries(subjectId).find((c) => c.id === chapterId)
  const [read, setRead] = useState(getSubjectProgress(subjectId).summariesRead.includes(chapterId))
  const [tocOpen, setTocOpen] = useState(false)
  if (!chapter) return <p>找不到此章節。</p>

  const sections = chapter.blocks
    .map((b, i) => ({ b, i }))
    .filter(({ b }) => isSectionHeading(b))

  function jump(i: number) {
    document.getElementById(`sec-${i}`)?.scrollIntoView({ block: 'start' })
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <Link to={`/subject/${subjectId}`} className="text-sm text-gray-500">‹ {chapter.title}</Link>
      <h1 className="text-2xl font-semibold leading-snug">
        <span className="text-gray-400 mr-2">{chapter.chapter}</span>{chapter.title}
      </h1>

      {sections.length > 1 && (
        <nav className="rounded-lg border bg-gray-50">
          <button onClick={() => setTocOpen((o) => !o)}
            className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium text-gray-600">
            <span>本章目錄（{sections.length} 節）</span>
            <span className="text-gray-400">{tocOpen ? '收合 ▾' : '展開 ▸'}</span>
          </button>
          {tocOpen && (
            <ul className="px-3 pb-3 space-y-1.5 border-t pt-2">
              {sections.map(({ b, i }) => (
                <li key={i}>
                  <button onClick={() => jump(i)} className="text-left text-sm text-sky-700 hover:underline">
                    {b.type === 'heading' ? b.text : ''}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </nav>
      )}

      <article><SummaryBlocks blocks={chapter.blocks} /></article>

      <button onClick={() => { toggleSummaryRead(subjectId, chapterId); setRead((r) => !r) }}
        className={`w-full rounded py-2.5 text-sm ${read ? 'bg-green-100 text-green-700' : 'bg-sky-600 text-white'}`}>
        {read ? '已標記為讀過（點擊取消）' : '標記為讀過'}
      </button>
    </div>
  )
}
