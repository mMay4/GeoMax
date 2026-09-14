import { useMapContext } from '../../context/MapContext'
import { SUCRE_CENTER } from '../../hooks/useMapbox'

export default function MapControls() {
  const { map, setSelectedFeature } = useMapContext()

  const goHome = () => {
    setSelectedFeature(null)
    map?.flyTo({
      center: SUCRE_CENTER,
      zoom: 12.6,
      pitch: 0,
      bearing: 0,
      essential: true
    })
  }

  return (
    <div className="home-control">
      <button
        className="map-tool-btn"
        title="Volver a la vista general de Sucre"
        aria-label="Volver a la vista general de Sucre"
        onClick={goHome}
      >
        ⌂
      </button>
    </div>
  )
}
