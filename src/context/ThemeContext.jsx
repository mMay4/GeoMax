import { createContext, useContext } from 'react'

const ThemeContext = createContext({
  colors: {
    primary: '#1E3A8A',
    secondary: '#3B82F6',
    accent: '#F59E0B',
    dark: '#111827',
    light: '#F9FAFB',
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444'
  }
})

export function ThemeProvider({ children }) {
  return (
    <ThemeContext.Provider value={{
      colors: {
        primary: '#1E3A8A',
        secondary: '#3B82F6',
        accent: '#F59E0B',
        dark: '#111827',
        light: '#F9FAFB',
        success: '#10B981',
        warning: '#F59E0B',
        error: '#EF4444'
      }
    }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
