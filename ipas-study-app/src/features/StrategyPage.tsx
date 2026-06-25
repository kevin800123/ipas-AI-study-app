import { STRATEGY } from '../data/strategy'
import { SummaryBlocks } from '../components/SummaryBlocks'

export function StrategyPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">備考攻略</h1>
        <p className="text-xs text-gray-400 mt-1">整理自公開備考資源與命題趨勢分析，僅供讀書策略參考；考試規格以 iPAS 官方最新簡章為準。</p>
      </div>
      {STRATEGY.map((sec) => (
        <section key={sec.id} className="space-y-3">
          <h2 className="text-lg font-semibold text-sky-800 border-l-4 border-sky-400 pl-2.5">{sec.title}</h2>
          <SummaryBlocks blocks={sec.blocks} />
        </section>
      ))}
    </div>
  )
}
