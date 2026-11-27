import React from 'react'
import ReactDOM from 'react-dom/client'
import 'mapbox-gl/dist/mapbox-gl.css'
import './styles/theme.css'
import './styles/globals.css'

import App from './App'
import { AuthProvider } from './context/AuthContext'
import './styles/updates.css'
import './styles/layout.css'
import './styles/sidebar.css'
import { MapProvider } from './context/MapContext'
import { ThemeProvider } from './context/ThemeContext'
import { WorkspaceProvider } from './context/WorkspaceContext'
import './styles/modules.css'
import './styles/reservations.css'
import './styles/lot-inspector.css'
import './styles/lot-price-editor.css'
import './styles/print-letterhead.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider>
      <AuthProvider>
      <MapProvider>
        <WorkspaceProvider>
          <App />
        </WorkspaceProvider>
      </MapProvider>
      </AuthProvider>
    </ThemeProvider>
  </React.StrictMode>
)
