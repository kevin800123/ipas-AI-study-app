import { useParams, Link } from 'react-router-dom'
import { useState, useEffect } from 'react'
import type { SummaryBlock } from '../types'
import { getSummaries } from '../data/subjects'
import { getSubjectProgress, toggleSummaryRead } from '../store/progress'
import { SummaryBlocks, isSectionHeading } from '../components/SummaryBlocks'

const SUB_RE = /^\d{1,2}\.\s/ // numbered sub-section titles (1. 2. 3.) — the TOC's second level

interface Section { title: string; blocks: SummaryBlock[] }

const normTitle = (t: string) => t.replace(/\s+/g, '')

function groupSections(blocks: SummaryBlock[]): Section[] {
  const sections: Section[] = []
  let cur: Section = { title: '概述', blocks: [] }
  for (const b of blocks) {
    if (isSectionHeading(b)) {
      if (cur.blocks.length) sections.push(cur)
      cur = { title: b.type === 'heading' ? b.text : '', blocks: [b] }
    } else {
      cur.blocks.push(b)
    }
  }
  if (cur.blocks.length) sections.push(cur)

  // Chapters often open with a brief overview that repeats each section title before
  // the real content. Fold those earlier duplicate "preview" sections into 概述 and
  // keep the last (full) occurrence of each section.
  const last = new Map<string, number>()
  sections.forEach((s, i) => last.set(normTitle(s.title), i))
  const out: Section[] = []
  for (let i = 0; i < sections.length; i++) {
    const isPreview = i < (last.get(normTitle(sections[i].title)) ?? i)
    if (isPreview && out.length) out[0].blocks = out[0].blocks.concat(sections[i].blocks)
    else out.push(sections[i])
  }
  return out
}

function subHeadings(blocks: SummaryBlock[]) {
  return blocks
    .map((b, idx) => ({ b, idx }))
    .filter(({ b }) => b.type === 'heading' && !isSectionHeading(b) && SUB_RE.test(b.text))
    .map(({ b, idx }) => ({ idx, text: b.type === 'heading' ? b.text : '' }))
}

export function SummaryPage() {
  const { subjectId = '', chapterId = '' } = useParams()
  const chapter = getSummaries(subjectId).find((c) => c.id === chapterId)
  const [read, setRead] = useState(getSubjectProgress(subjectId).summariesRead.includes(chapterId))
  const [active, setActive] = useState(0)

  useEffect(() => { setActive(0) }, [chapterId])
  useEffect(() => { window.scrollTo({ top: 0 }) }, [active, chapterId])

  if (!chapter) return <p>找不到此章節。</p>

  const sections = groupSections(chapter.blocks)
  const paged = sections.length > 1
  const idx = Math.min(active, sections.length - 1)
  const sec = sections[idx]
  const subs = paged ? subHeadings(sec.blocks) : []

  function jump(i: number) {
    document.getElementById(`sec-${i}`)?.scrollIntoView({ block: 'start' })
  }

  const tocSidebar = (
    <nav className="text-sm">
      {sections.map((s, si) => (
        <div key={si}>
          <button onClick={() => setActive(si)}
            className={`block w-full text-left py-1 truncate ${si === idx ? 'text-sky-700 font-medium' : 'text-gray-600 hover:text-sky-700'}`}>
            {s.title}
          </button>
          {si === idx && subs.length > 0 && (
            <ul className="ml-1 mb-1 border-l border-gray-200 space-y-1">
              {subs.map((h) => (
                <li key={h.idx}>
                  <button onClick={() => jump(h.idx)}
                    className="block w-full text-left truncate text-xs text-gray-500 hover:text-sky-700 pl-3">
                    {h.text}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </nav>
  )

  const body = (
    <div className="w-full max-w-2xl mx-auto space-y-5">
      <Link to={`/subject/${subjectId}`} className="text-sm text-gray-500">‹ {chapter.title}</Link>
      <h1 className="text-2xl font-semibold leading-snug">
        <span className="text-gray-400 mr-2">{chapter.chapter}</span>{chapter.title}
      </h1>

      {paged && (
        <div className="lg:hidden space-y-1">
          <select value={idx} onChange={(e) => setActive(Number(e.target.value))}
            className="w-full border rounded p-2 text-sm bg-white">
            {sections.map((s, si) => <option key={si} value={si}>{si + 1}. {s.title}</option>)}
          </select>
          <div className="text-xs text-gray-400 text-right">第 {idx + 1} / {sections.length} 節</div>
        </div>
      )}

      <article><SummaryBlocks blocks={sec.blocks} /></article>

      {paged && (
        <div className="flex justify-between gap-2 pt-1">
          <button disabled={idx === 0} onClick={() => setActive(idx - 1)}
            className="border rounded px-3 py-2 text-sm disabled:opacity-40">‹ 上一節</button>
          <button disabled={idx === sections.length - 1} onClick={() => setActive(idx + 1)}
            className="border rounded px-3 py-2 text-sm disabled:opacity-40">下一節 ›</button>
        </div>
      )}

      <button onClick={() => { toggleSummaryRead(subjectId, chapterId); setRead((r) => !r) }}
        className={`w-full rounded py-2.5 text-sm ${read ? 'bg-green-100 text-green-700' : 'bg-sky-600 text-white'}`}>
        {read ? '已標記為讀過（點擊取消）' : '標記為讀過'}
      </button>
    </div>
  )

  if (!paged) return body

  return (
    <div className="lg:flex lg:gap-8 lg:items-start">
      <aside className="hidden lg:block w-60 shrink-0 lg:sticky lg:top-16 self-start max-h-[calc(100vh-5rem)] overflow-y-auto">
        <div className="text-sm font-medium text-gray-500 mb-2">本章目錄</div>
        {tocSidebar}
      </aside>
      <div className="flex-1 min-w-0">{body}</div>
    </div>
  )
}
