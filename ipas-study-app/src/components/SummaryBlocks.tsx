import type { SummaryBlock } from '../types'

export function SummaryBlocks({ blocks }: { blocks: SummaryBlock[] }) {
  return (
    <div className="space-y-4">
      {blocks.map((b, i) => {
        if (b.type === 'text') return <p key={i} className="leading-7">{b.content}</p>
        if (b.type === 'heading') return <h3 key={i} className="font-semibold text-base mt-3 text-gray-800">{b.text}</h3>
        if (b.type === 'keypoints')
          return <ul key={i} className="list-disc pl-5 space-y-1">{b.items.map((it, j) => <li key={j}>{it}</li>)}</ul>
        if (b.type === 'table')
          return (
            <table key={i} className="w-full text-sm border-collapse">
              <thead><tr>{b.headers.map((h, j) => <th key={j} className="border p-2 text-left bg-gray-50">{h}</th>)}</tr></thead>
              <tbody>{b.rows.map((r, j) => <tr key={j}>{r.map((c, k) => <td key={k} className="border p-2">{c}</td>)}</tr>)}</tbody>
            </table>
          )
        return <div key={i} className="my-2" dangerouslySetInnerHTML={{ __html: b.svg }} aria-label={b.caption ?? '示意圖'} />
      })}
    </div>
  )
}
