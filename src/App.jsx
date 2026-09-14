import Header from './components/Layout/Header'
import Sidebar from './components/Layout/Sidebar'
import MapContainer from './components/Map/MapContainer'

export default function App() {
  return (
    <div className="app-shell">
      <Header />

      <div className="app-body">
        <Sidebar />

        <main className="map-area" aria-label="Mapa geográfico">
          <MapContainer />
        </main>
      </div>
    </div>
  )
}
