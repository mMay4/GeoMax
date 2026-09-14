import React from 'react'
import ReactDOM from 'react-dom/client'
import 'mapbox-gl/dist/mapbox-gl.css'
import './styles/theme.css'
import './styles/globals.css'

import App from './App'
import { MapProvider } from './context/MapContext'
import { ThemeProvider } from './context/ThemeContext'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider>
      <MapProvider>
        <App />
      </MapProvider>
    </ThemeProvider>
  </React.StrictMode>
)
