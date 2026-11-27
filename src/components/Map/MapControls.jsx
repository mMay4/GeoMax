import { useMapContext } from '../../context/MapContext'
import { SUCRE_CENTER, INITIAL_ZOOM } from '../../hooks/useMapbox'

export default function MapControls() {
  const { map, setSelectedFeature } = useMapContext()

  const goHome = () => {
    setSelectedFeature(null)
    map?.flyTo({
      center: SUCRE_CENTER,
      zoom: INITIAL_ZOOM,
      pitch: 0,
      bearing: 0,
      essential: true
    })
  }

  return (
    <div className="home-control">
      <button
        className="map-tool-btn"
        title="Volver a Karapanza de Corazón III"
        aria-label="Volver a Karapanza de Corazón III"
        onClick={goHome}
      >
        ⌂
      </button>
    </div>
  )
}
