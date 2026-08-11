'use client'

import { useEffect, useSyncExternalStore } from 'react'
import { Moon, Sun } from 'lucide-react'

const THEME_EVENT = 'ai-post-gen-theme-change'

function subscribe(callback: () => void) {
  window.addEventListener(THEME_EVENT, callback)
  return () => window.removeEventListener(THEME_EVENT, callback)
}

function getThemeSnapshot() {
  return document.documentElement.classList.contains('dark')
}

function getServerThemeSnapshot() {
  return true
}

export function ThemePreference() {
  useEffect(() => {
    const storedTheme = localStorage.getItem('darkMode')
    const shouldUseDark = storedTheme === null ? true : storedTheme === 'true'
    document.documentElement.classList.toggle('dark', shouldUseDark)
    window.dispatchEvent(new Event(THEME_EVENT))
  }, [])

  return null
}

export function useDarkMode() {
  return useSyncExternalStore(subscribe, getThemeSnapshot, getServerThemeSnapshot)
}

export function ThemeToggle({ showLabel = false, className }: { showLabel?: boolean; className?: string }) {
  const darkMode = useDarkMode()

  const toggleTheme = () => {
    const nextTheme = !darkMode
    document.documentElement.classList.toggle('dark', nextTheme)
    localStorage.setItem('darkMode', String(nextTheme))
    window.dispatchEvent(new Event(THEME_EVENT))
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`inline-flex items-center justify-center gap-2 rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white ${className ?? ''}`}
      title={darkMode ? 'Ativar modo claro' : 'Ativar modo escuro'}
      aria-label={darkMode ? 'Ativar modo claro' : 'Ativar modo escuro'}
    >
      {darkMode ? <Sun className="size-5 text-amber-400" /> : <Moon className="size-5" />}
      {showLabel ? <span className="text-sm font-medium">{darkMode ? 'Modo claro' : 'Modo escuro'}</span> : null}
    </button>
  )
}
