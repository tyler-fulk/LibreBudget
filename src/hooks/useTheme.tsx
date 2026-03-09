import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'

export type Theme = 'dark' | 'light' | 'ocean' | 'black' | 'developer' | 'monokai' | 'obsidian' | 'purple'

export const THEMES: Theme[] = ['black', 'dark', 'developer', 'monokai', 'obsidian', 'ocean', 'purple', 'light']

interface ThemeContextValue {
  theme: Theme
  setTheme: (t: Theme) => void
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'dark',
  setTheme: () => {},
  toggleTheme: () => {},
})

export const useTheme = () => useContext(ThemeContext)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    let saved = localStorage.getItem('lb-theme') as string | null
    if (saved === 'amoled') saved = 'black' // migrate old theme name
    return THEMES.includes(saved as Theme) ? (saved as Theme) : 'dark'
  })

  useEffect(() => {
    localStorage.setItem('lb-theme', theme)
    const root = document.documentElement
    root.classList.remove('light', 'theme-ocean', 'theme-black', 'theme-developer', 'theme-monokai', 'theme-obsidian', 'theme-purple')
    if (theme === 'light') {
      root.classList.add('light')
      root.style.colorScheme = 'light'
    } else {
      root.style.colorScheme = 'dark'
      if (theme === 'ocean') root.classList.add('theme-ocean')
      else if (theme === 'black') root.classList.add('theme-black')
      else if (theme === 'developer') root.classList.add('theme-developer')
      else if (theme === 'monokai') root.classList.add('theme-monokai')
      else if (theme === 'obsidian') root.classList.add('theme-obsidian')
      else if (theme === 'purple') root.classList.add('theme-purple')
    }
  }, [theme])

  const toggleTheme = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}
