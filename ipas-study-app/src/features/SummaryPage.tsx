import { useParams, Link } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { getSummaries } from '../data/subjects'
import { getSubjectProgress, toggleSummaryRead } from '../store/progress'
import { SummaryBlocks, isSectionHeading } from '../components/SummaryBlocks'
import { useViewMode } from '../store/viewMode'

const STEP_RE = /^[a-z][.、]/ // lowercase step labels (a. b. c.) — too granular for the TOC

export function SummaryPage() {
  const { subjectId = '', chapterId = '' } = useParams()
  const chapter = getSummaries(subjectId).find((c) => c.id === chapterId)
  const web = useViewMode() === 'web'
  const [read, setRead] = useState(getSubjectProgress(subjectId).summariesRead.includes(chapterId))
  const [tocOpen, setTocOpen] = useState(false)
  const [activeId, setActiveId] = useState<number | null>(null)

  // scroll-spy: highlight the last TOC heading whose top has scrolled past ~100px
  useEffect(() => {
    if (!chapter) return
    const idxs = chapter.blocks
      .map((b, i) => ({ b, i }))
      .filter(({ b }) => b.type === 'heading' && !STEP_RE.test(b.text))
      .map(({ i }) => i)
    const onScroll = () => {
      let cur: number | null = null
      for (const i of idxs) {
        const el = document.getElementById(`sec-${i}`)
        if (el && el.getBoundingClientRect().top <= 100) cur = i
      }
      setActiveId(cur)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chapterId])

  if (!chapter) return <p>找不到此章節。</p>

  const toc = chapter.blocks
    .map((b, i) => ({ b, i }))
    .filter(({ b }) => b.type === 'heading' && !STEP_RE.test(b.text))
    .map(({ b, i }) => ({ i, text: b.type === 'heading' ? b.text : '', level: isSectionHeading(b) ? 1 : 2 }))

  function jump(i: number) {
    document.getElementById(`sec-${i}`)?.scrollIntoView({ block: 'start' })
  }

  const tocItems = (
    <ul className="space-y-1">
      {toc.map((t) => {
        const active = t.i === activeId
        return (
          <li key={t.i}>
            <button onClick={() => jump(t.i)}
              className={`block w-full text-left truncate hover:text-sky-700 ${
                t.level === 1
                  ? 'text-sm font-medium mt-1.5'
                  : 'text-xs pl-3 border-l'
              } ${active ? 'text-sky-700 border-sky-400' : t.level === 1 ? 'text-gray-700' : 'text-gray-500 border-gray-200'}`}>
              {t.text}
            </button>
          </li>
        )
      })}
    </ul>
  )

  const content = (
    <div className="w-full max-w-2xl mx-auto space-y-5">
      <Link to={`/subject/${subjectId}`} className="text-sm text-gray-500">‹ {chapter.title}</Link>
      <h1 className="text-2xl font-semibold leading-snug">
        <span className="text-gray-400 mr-2">{chapter.chapter}</span>{chapter.title}
      </h1>

      {/* top collapsible TOC — always in app mode; only on narrow screens in web mode */}
      {toc.length > 1 && (
        <nav className={`rounded-lg border bg-gray-50 ${web ? 'lg:hidden' : ''}`}>
          <button onClick={() => setTocOpen((o) => !o)}
            className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium text-gray-600">
            <span>本章目錄（{toc.length}）</span>
            <span className="text-gray-400">{tocOpen ? '收合 ▾' : '展開 ▸'}</span>
          </button>
          {tocOpen && <div className="px-3 pb-3 border-t pt-2">{tocItems}</div>}
        </nav>
      )}

      <article><SummaryBlocks blocks={chapter.blocks} /></article>

      <button onClick={() => { toggleSummaryRead(subjectId, chapterId); setRead((r) => !r) }}
        className={`w-full rounded py-2.5 text-sm ${read ? 'bg-green-100 text-green-700' : 'bg-sky-600 text-white'}`}>
        {read ? '已標記為讀過（點擊取消）' : '標記為讀過'}
      </button>
    </div>
  )

  if (!web) return content

  // web mode: sticky two-level sidebar TOC on the left for wide screens
  return (
    <div className="lg:flex lg:gap-8 lg:items-start">
      {toc.length > 0 && (
        <aside className="hidden lg:block w-56 shrink-0 lg:sticky lg:top-16 self-start max-h-[calc(100vh-5rem)] overflow-y-auto">
          <div className="text-sm font-medium text-gray-500 mb-2">本章目錄</div>
          {tocItems}
        </aside>
      )}
      <div className="flex-1 min-w-0">{content}</div>
    </div>
  )
}
