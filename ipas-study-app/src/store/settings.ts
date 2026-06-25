import { useSyncExternalStore } from 'react'

export type Theme = 'light' | 'dark'
export const FONT_SIZES = [16, 18, 20, 22] as const
export type FontPx = (typeof FONT_SIZES)[number]

interface Settings {
  theme: Theme
  fontPx: FontPx
}

const KEY = 'ipas-settings'
const listeners = new Set<() => void>()

function read(): Settings {
  const def: Settings = { theme: 'light', fontPx: 18 }
  if (typeof localStorage === 'undefined') return def
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || '{}')
    return {
      theme: raw.theme === 'dark' ? 'dark' : 'light',
      fontPx: (FONT_SIZES as readonly number[]).includes(raw.fontPx) ? raw.fontPx : 18,
    }
  } catch {
    return def
  }
}

let current: Settings = read()

function apply() {
  if (typeof document === 'undefined') return
  document.documentElement.classList.toggle('dark', current.theme === 'dark')
  document.documentElement.style.fontSize = `${current.fontPx}px`
  document.documentElement.style.colorScheme = current.theme
}
apply()

function commit(next: Settings) {
  current = next
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    /* ignore */
  }
  apply()
  listeners.forEach((l) => l())
}

export function toggleTheme() {
  commit({ ...current, theme: current.theme === 'dark' ? 'light' : 'dark' })
}
export function setFontPx(px: FontPx) {
  commit({ ...current, fontPx: px })
}
export function stepFont(dir: 1 | -1) {
  const i = FONT_SIZES.indexOf(current.fontPx)
  const ni = Math.min(FONT_SIZES.length - 1, Math.max(0, i + dir))
  commit({ ...current, fontPx: FONT_SIZES[ni] })
}

export function useSettings(): Settings {
  return useSyncExternalStore(
    (cb) => { listeners.add(cb); return () => listeners.delete(cb) },
    () => current,
    () => ({ theme: 'light', fontPx: 18 }),
  )
}
