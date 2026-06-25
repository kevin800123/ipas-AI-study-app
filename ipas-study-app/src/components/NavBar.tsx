import { NavLink } from 'react-router-dom'
import { useViewMode, toggleViewMode } from '../store/viewMode'
import { useSettings, toggleTheme, stepFont } from '../store/settings'

const items = [
  { to: '/', label: '首頁' },
  { to: '/wrong', label: '錯題本' },
  { to: '/strategy', label: '攻略' },
  { to: '/info', label: '考試資訊' },
]

export function NavBar() {
  const web = useViewMode() === 'web'
  const { theme } = useSettings()

  const appearance = (
    <div className="flex items-center justify-center gap-1 shrink-0 py-2 md:border-t">
      <button onClick={toggleTheme} title="深色 / 淺色模式"
        className="px-2 py-1 text-sm rounded hover:bg-gray-100">{theme === 'dark' ? '☀️' : '🌙'}</button>
      <button onClick={() => stepFont(-1)} title="縮小字級"
        className="px-1.5 py-0.5 text-xs rounded border hover:bg-gray-100">A−</button>
      <button onClick={() => stepFont(1)} title="放大字級"
        className="px-1.5 py-0.5 text-sm rounded border hover:bg-gray-100">A＋</button>
    </div>
  )

  const toggle = (
    <button
      onClick={toggleViewMode}
      title="一鍵切換 App版 / 網頁版"
      className={
        web
          ? 'shrink-0 border rounded-full px-3 py-1 text-sm text-sky-700 border-sky-200 hover:bg-sky-50'
          : 'flex-1 flex flex-col items-center justify-center py-3 text-sm text-sky-700 md:flex-none md:py-3 md:border-t'
      }
    >
      {web ? '🖥️ 網頁版' : '📱 App版'}
    </button>
  )

  if (web) {
    return (
      <nav className="sticky top-0 z-10 border-b bg-white">
        <div className="max-w-5xl mx-auto flex items-center gap-6 px-4 h-14">
          <span className="font-medium whitespace-nowrap">iPAS 備考</span>
          <div className="flex gap-5 flex-1">
            {items.map((it) => (
              <NavLink
                key={it.to}
                to={it.to}
                end={it.to === '/'}
                className={({ isActive }) =>
                  `text-sm ${isActive ? 'text-sky-700 font-medium' : 'text-gray-500 hover:text-gray-800'}`
                }
              >
                {it.label}
              </NavLink>
            ))}
          </div>
          {appearance}
          {toggle}
        </div>
      </nav>
    )
  }

  return (
    <nav className="fixed bottom-0 inset-x-0 border-t bg-white flex md:static md:border-t-0 md:border-r md:flex-col md:w-48 md:min-h-screen">
      {items.map((it) => (
        <NavLink
          key={it.to}
          to={it.to}
          end={it.to === '/'}
          className={({ isActive }) =>
            `flex-1 text-center py-3 text-sm md:flex-none ${isActive ? 'text-sky-700 font-medium' : 'text-gray-500'}`
          }
        >
          {it.label}
        </NavLink>
      ))}
      {toggle}
      {appearance}
    </nav>
  )
}
