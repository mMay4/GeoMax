import { useEffect, useRef } from 'react'
import ReactDOM from 'react-dom/client'
import mapboxgl from 'mapbox-gl'
import useMapbox from '../../hooks/useMapbox'
import useLayers from '../../hooks/useLayers'
import PopupInfo from './PopupInfo'
import MapControls from './MapControls'
import MeasurementTools from '../Tools/MeasurementTools'
import { useMapContext } from '../../context/MapContext'

export default function MapContainer() {
  const containerRef = useRef(null)

  useMapbox(containerRef)
  useLayers()

  const { map, setSelectedFeature, measureMode } = useMapContext()

  useEffect(() => {
    if (!map) return

    let popup = null
    let popupRoot = null

    const showPopup = (feature, lngLat) => {
      popup?.remove()
      popupRoot?.unmount()

      const node = document.createElement('div')
      popupRoot = ReactDOM.createRoot(node)
      popupRoot.render(
        <PopupInfo properties={feature.properties} />
      )

      popup = new mapboxgl.Popup({
        closeButton: true,
        closeOnClick: true,
        maxWidth: '320px'
      })
        .setLngLat(lngLat)
        .setDOMContent(node)
        .addTo(map)
    }

    const interactiveLayers = () =>
      ['lotes-fill', 'puntos-unclustered']
        .filter(layerId => map.getLayer(layerId))

    const handleClick = event => {
      if (measureMode) return

      const layers = interactiveLayers()
      if (!layers.length) return

      const features = map.queryRenderedFeatures(event.point, { layers })
      const feature = features[0]
      if (!feature) return

      if (feature.layer.id === 'lotes-fill') {
        setSelectedFeature(feature)
        showPopup(feature, event.lngLat)
      }

      if (feature.layer.id === 'puntos-unclustered') {
        showPopup(feature, feature.geometry.coordinates)
      }
    }

    const handleMove = event => {
      if (measureMode) return

      const layers = interactiveLayers()
      if (!layers.length) {
        map.getCanvas().style.cursor = ''
        return
      }

      const hovered = map.queryRenderedFeatures(event.point, { layers })
      map.getCanvas().style.cursor = hovered.length ? 'pointer' : ''
    }

    const handleClusterClick = event => {
      if (measureMode || !map.getLayer('clusters')) return

      const features = map.queryRenderedFeatures(event.point, {
        layers: ['clusters']
      })
      const cluster = features[0]
      if (!cluster) return

      const clusterId = cluster.properties.cluster_id
      map.getSource('puntos')?.getClusterExpansionZoom(
        clusterId,
        (error, zoom) => {
          if (error) return
          map.easeTo({
            center: cluster.geometry.coordinates,
            zoom
          })
        }
      )
    }

    map.on('click', handleClick)
    map.on('mousemove', handleMove)
    map.on('click', handleClusterClick)

    return () => {
      map.off('click', handleClick)
      map.off('mousemove', handleMove)
      map.off('click', handleClusterClick)

      popup?.remove()
      popupRoot?.unmount()

      if (map?.getCanvas()) {
        map.getCanvas().style.cursor = ''
      }
    }
  }, [map, setSelectedFeature, measureMode])

  const missingToken = !import.meta.env.VITE_MAPBOX_TOKEN

  return (
    <div className="map-root">
      <div ref={containerRef} className="map-canvas" />

      {missingToken && (
        <div className="map-message">
          <div className="map-message-card">
            <strong>Token de Mapbox no configurado</strong>
            <p>
              Crea un archivo <code>.env</code> en la raíz del proyecto y define
              <code> VITE_MAPBOX_TOKEN</code> usando como referencia
              <code> .env.example</code>.
            </p>
          </div>
        </div>
      )}

      <MapControls />
      <MeasurementTools />
    </div>
  )
}
