import { useState } from 'react'
import { useMapContext } from '../../context/MapContext'
import { geocodeSucre } from '../../services/geojsonService'

export default function Header() {
  const { map, sidebarOpen, setSidebarOpen } = useMapContext()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)

  const search = async () => {
    if (!query.trim()) return

    setLoading(true)
    try {
      const items = await geocodeSucre(
        query,
        import.meta.env.VITE_MAPBOX_TOKEN
      )
      setResults(items)
    } catch (error) {
      console.error(error)
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  const selectResult = item => {
    map?.flyTo({
      center: item.center,
      zoom: 16,
      essential: true
    })
    setQuery(item.place_name)
    setResults([])
  }

  return (
    <header className="header">
      <button
        className="icon-btn"
        onClick={() => setSidebarOpen(!sidebarOpen)}
        aria-label={sidebarOpen ? 'Cerrar panel lateral' : 'Abrir panel lateral'}
        title="Capas y opciones"
      >
        ☰
      </button>

      <div className="brand">
        <div className="brand-mark">MAX</div>
        <div className="brand-copy">
          <h1>GeoVisor MAX Inversiones</h1>
          <p>Urbanizaciones y lotes · Sucre</p>
        </div>
      </div>

      <div className="header-spacer" />

      <div className="search-wrap">
        <input
          className="search-input"
          value={query}
          onChange={event => setQuery(event.target.value)}
          onKeyDown={event => {
            if (event.key === 'Enter') search()
          }}
          placeholder="Buscar dirección o coordenadas..."
          aria-label="Buscar dirección o coordenadas"
        />
        <button
          className="search-btn"
          onClick={search}
          aria-label="Buscar"
          title="Buscar"
        >
          {loading ? '…' : '⌕'}
        </button>

        {results.length > 0 && (
          <div className="search-results">
            {results.map(item => (
              <button
                type="button"
                className="search-result"
                key={item.id}
                onClick={() => selectResult(item)}
              >
                {item.place_name}
              </button>
            ))}
          </div>
        )}
      </div>
    </header>
  )
}
