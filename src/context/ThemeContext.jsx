import { createContext, useContext } from 'react'

const ThemeContext = createContext({
  colors: {
    primary: '#308056',
    secondary: '#FC8801',
    accent: '#F59E0B',
    dark: '#183A29',
    light: '#FFFAFA',
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444'
  }
})

export function ThemeProvider({ children }) {
  return (
    <ThemeContext.Provider value={{
      colors: {
        primary: '#308056',
        secondary: '#FC8801',
        accent: '#F59E0B',
        dark: '#183A29',
        light: '#FFFAFA',
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
