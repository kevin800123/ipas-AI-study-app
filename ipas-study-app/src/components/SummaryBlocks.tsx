import type { SummaryBlock } from '../types'

const SECTION_RE = /^[3-6]\.\d/

export function isSectionHeading(b: SummaryBlock): boolean {
  return b.type === 'heading' && SECTION_RE.test(b.text)
}

export function SummaryBlocks({ blocks }: { blocks: SummaryBlock[] }) {
  return (
    <div className="space-y-3.5">
      {blocks.map((b, i) => {
        if (b.type === 'text') return <p key={i} className="leading-8 text-gray-800">{b.content}</p>
        if (b.type === 'heading') {
          if (SECTION_RE.test(b.text))
            return (
              <h2 key={i} id={`sec-${i}`}
                className="scroll-mt-20 text-lg font-semibold text-sky-800 border-l-4 border-sky-400 pl-2.5 mt-8 first:mt-0 mb-1">
                {b.text}
              </h2>
            )
          return <h3 key={i} className="font-semibold text-gray-700 mt-4 mb-0.5">{b.text}</h3>
        }
        if (b.type === 'keypoints')
          return (
            <ul key={i} className="list-disc pl-5 space-y-1.5 leading-7 text-gray-800 marker:text-sky-400">
              {b.items.map((it, j) => <li key={j} className="pl-1">{it}</li>)}
            </ul>
          )
        if (b.type === 'table')
          return (
            <div key={i} className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead><tr>{b.headers.map((h, j) => <th key={j} className="border p-2 text-left bg-gray-50">{h}</th>)}</tr></thead>
                <tbody>{b.rows.map((r, j) => <tr key={j}>{r.map((c, k) => <td key={k} className="border p-2">{c}</td>)}</tr>)}</tbody>
              </table>
            </div>
          )
        return <div key={i} className="my-2" dangerouslySetInnerHTML={{ __html: b.svg }} aria-label={b.caption ?? '示意圖'} />
      })}
    </div>
  )
}
