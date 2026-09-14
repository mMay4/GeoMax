import LayerController from '../Map/LayerController'
import ResponsiveDrawer from './ResponsiveDrawer'
import { useMapContext } from '../../context/MapContext'

const MAP_STYLES = {
  streets: 'mapbox://styles/mapbox/streets-v12',
  satellite: 'mapbox://styles/mapbox/satellite-streets-v12',
  dark: 'mapbox://styles/mapbox/dark-v11'
}

export default function Sidebar() {
  const {
    sidebarOpen,
    setSidebarOpen,
    baseMap,
    setBaseMap,
    map
  } = useMapContext()

  const changeBaseMap = styleKey => {
    setBaseMap(styleKey)
    map?.setStyle(MAP_STYLES[styleKey])
  }

  return (
    <>
      <aside className={`sidebar ${sidebarOpen ? '' : 'closed'}`}>
        <section className="section-card">
          <h2 className="section-title">Ámbito del sistema</h2>
          <strong>Sucre, Bolivia</strong>
          <p className="section-copy">
            Esta versión del GeoVisor está delimitada únicamente a las
            urbanizaciones y lotes de MAX Inversiones ubicados en Sucre.
          </p>
        </section>

        <section className="section-card">
          <h2 className="section-title">Mapa base</h2>
          <div className="basemap-grid">
            <button
              className={`basemap-btn ${baseMap === 'streets' ? 'active' : ''}`}
              onClick={() => changeBaseMap('streets')}
            >
              Calles
            </button>
            <button
              className={`basemap-btn ${baseMap === 'satellite' ? 'active' : ''}`}
              onClick={() => changeBaseMap('satellite')}
            >
              Satélite
            </button>
            <button
              className={`basemap-btn ${baseMap === 'dark' ? 'active' : ''}`}
              onClick={() => changeBaseMap('dark')}
            >
              Oscuro
            </button>
          </div>
        </section>

        <LayerController />

        <section className="section-card">
          <h2 className="section-title">Leyenda de lotes</h2>
          <div className="legend-row">
            <span className="swatch" style={{background:'var(--state-success)'}} />
            Disponible
          </div>
          <div className="legend-row">
            <span className="swatch" style={{background:'var(--state-warning)'}} />
            Reservado
          </div>
          <div className="legend-row">
            <span className="swatch" style={{background:'var(--state-error)'}} />
            Vendido
          </div>
          <div className="legend-row">
            <span className="swatch" style={{background:'var(--brand-accent)'}} />
            Seleccionado
          </div>
        </section>
      </aside>

      <ResponsiveDrawer
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
    </>
  )
}
