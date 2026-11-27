import { useEffect, useState } from 'react'
import Login from './components/Auth/Login'
import Header from './components/Layout/Header'
import Sidebar from './components/Layout/Sidebar'
import MapContainer from './components/Map/MapContainer'
import AccountPanel from './components/Account/AccountPanel'
import { useAuth } from './context/AuthContext'
import { useMapContext } from './context/MapContext'
import ModulePanel from './components/Modules/ModulePanel'

export default function App() {
  const {user, booting} = useAuth()
  const {sidebarOpen, map} = useMapContext()
  const [accountOpen, setAccountOpen] = useState(false)

  useEffect(() => {
    if (!map) return
    const timeout = setTimeout(() => map.resize(), 310)
    return () => clearTimeout(timeout)
  }, [map, sidebarOpen])

  if (booting) return <div className="geomax-loading">Cargando GeoMax…</div>
  if (!user) return <Login />

  return <div className={`app-shell ${sidebarOpen ? 'sidebar-is-open' : 'sidebar-is-closed'}`}>
    <Header onAccountClick={() => setAccountOpen(true)} />
    <div className="app-body">
      <Sidebar />
      <main className="map-area" aria-label="Mapa geográfico">
        <MapContainer />
      </main>
    </div>
    <ModulePanel />
    {accountOpen && <AccountPanel onClose={() => setAccountOpen(false)} />}
  </div>
}
