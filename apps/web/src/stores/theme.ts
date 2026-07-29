import { create } from 'zustand'

export type ThemeMode = 'light' | 'dark'

type ThemeState = {
  mode: ThemeMode
  setMode: (mode: ThemeMode) => void
  toggle: () => void
}

function applyThemeMode(mode: ThemeMode) {
  document.documentElement.classList.toggle('dark', mode === 'dark')
  document.documentElement.style.colorScheme = mode
  window.localStorage.setItem('theme', mode)
}

function getInitialMode(): ThemeMode {
  if (typeof window === 'undefined') return 'light'
  const stored = window.localStorage.getItem('theme')
  if (stored === 'light' || stored === 'dark') return stored
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light'
}

const initialMode = getInitialMode()
applyThemeMode(initialMode)

export const useThemeStore = create<ThemeState>((set, get) => ({
  mode: initialMode,
  setMode: (mode) => {
    applyThemeMode(mode)
    set({ mode })
  },
  toggle: () => {
    const next: ThemeMode = get().mode === 'light' ? 'dark' : 'light'
    applyThemeMode(next)
    set({ mode: next })
  },
}))
