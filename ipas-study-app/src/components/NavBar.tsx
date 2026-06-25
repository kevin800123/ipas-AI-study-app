import { NavLink } from 'react-router-dom'
import { useViewMode, toggleViewMode } from '../store/viewMode'

const items = [
  { to: '/', label: '首頁' },
  { to: '/wrong', label: '錯題本' },
  { to: '/strategy', label: '攻略' },
  { to: '/info', label: '考試資訊' },
]

export function NavBar() {
  const web = useViewMode() === 'web'

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
    </nav>
  )
}
