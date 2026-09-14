import { useEffect } from 'react'
import * as turf from '@turf/turf'
import { useMapContext } from '../../context/MapContext'

const SOURCE_ID = 'measurement-source'
const FILL_LAYER = 'measurement-fill'
const LINE_LAYER = 'measurement-line'
const POLYGON_LINE_LAYER = 'measurement-polygon-line'
const POINT_LAYER = 'measurement-points'

function emptyFeatureCollection() {
  return { type: 'FeatureCollection', features: [] }
}

function ensureMeasurementLayers(map) {
  if (!map.getSource(SOURCE_ID)) {
    map.addSource(SOURCE_ID, {
      type: 'geojson',
      data: emptyFeatureCollection()
    })
  }

  if (!map.getLayer(FILL_LAYER)) {
    map.addLayer({
      id: FILL_LAYER,
      type: 'fill',
      source: SOURCE_ID,
      filter: ['==', ['geometry-type'], 'Polygon'],
      paint: {
        'fill-color': '#F59E0B',
        'fill-opacity': 0.18
      }
    })
  }

  if (!map.getLayer(LINE_LAYER)) {
    map.addLayer({
      id: LINE_LAYER,
      type: 'line',
      source: SOURCE_ID,
      filter: ['==', ['geometry-type'], 'LineString'],
      paint: {
        'line-color': '#F59E0B',
        'line-width': 3
      }
    })
  }

  if (!map.getLayer(POLYGON_LINE_LAYER)) {
    map.addLayer({
      id: POLYGON_LINE_LAYER,
      type: 'line',
      source: SOURCE_ID,
      filter: ['==', ['geometry-type'], 'Polygon'],
      paint: {
        'line-color': '#F59E0B',
        'line-width': 3
      }
    })
  }

  if (!map.getLayer(POINT_LAYER)) {
    map.addLayer({
      id: POINT_LAYER,
      type: 'circle',
      source: SOURCE_ID,
      filter: ['==', ['geometry-type'], 'Point'],
      paint: {
        'circle-color': '#1E3A8A',
        'circle-radius': 5,
        'circle-stroke-color': '#FFFFFF',
        'circle-stroke-width': 2
      }
    })
  }
}

export default function MeasurementTools() {
  const {
    map,
    measureMode,
    setMeasureMode,
    measureResult,
    setMeasureResult
  } = useMapContext()

  useEffect(() => {
    if (!map || !measureMode || !map.isStyleLoaded()) return

    ensureMeasurementLayers(map)

    const coordinates = []

    const render = () => {
      const features = coordinates.map(coordinate => turf.point(coordinate))

      if (measureMode === 'distance' && coordinates.length >= 2) {
        const line = turf.lineString(coordinates)
        features.push(line)

        const kilometers = turf.length(line, { units: 'kilometers' })
        setMeasureResult(
          kilometers < 1
            ? `${(kilometers * 1000).toFixed(1)} m`
            : `${kilometers.toFixed(3)} km`
        )
      }

      if (measureMode === 'area' && coordinates.length >= 3) {
        const polygon = turf.polygon([[...coordinates, coordinates[0]]])
        features.push(polygon)

        const squareMeters = turf.area(polygon)
        setMeasureResult(
          squareMeters < 10000
            ? `${squareMeters.toFixed(1)} m²`
            : `${(squareMeters / 10000).toFixed(2)} ha`
        )
      }

      map.getSource(SOURCE_ID)?.setData({
        type: 'FeatureCollection',
        features
      })
    }

    const handleClick = event => {
      coordinates.push([event.lngLat.lng, event.lngLat.lat])
      render()
    }

    const handleDoubleClick = event => {
      event.preventDefault()
      render()
      setMeasureMode(null)
    }

    map.getCanvas().style.cursor = 'crosshair'
    map.doubleClickZoom.disable()

    setMeasureResult(
      measureMode === 'distance'
        ? 'Haz clic para agregar puntos. Doble clic para finalizar.'
        : 'Marca al menos 3 puntos. Doble clic para finalizar.'
    )

    map.on('click', handleClick)
    map.on('dblclick', handleDoubleClick)

    return () => {
      map.off('click', handleClick)
      map.off('dblclick', handleDoubleClick)
      map.doubleClickZoom.enable()
      map.getCanvas().style.cursor = ''
    }
  }, [map, measureMode, setMeasureMode, setMeasureResult])

  useEffect(() => {
    if (!map) return

    const onStyleLoad = () => {
      setMeasureMode(null)
      setMeasureResult(null)
    }

    map.on('style.load', onStyleLoad)
    return () => map.off('style.load', onStyleLoad)
  }, [map, setMeasureMode, setMeasureResult])

  const clear = () => {
    if (map?.getSource(SOURCE_ID)) {
      map.getSource(SOURCE_ID).setData(emptyFeatureCollection())
    }

    setMeasureMode(null)
    setMeasureResult(null)
  }

  return (
    <>
      <div className="map-toolbar">
        <button
          className={`map-tool-btn ${measureMode === 'distance' ? 'active' : ''}`}
          title="Medir distancia"
          aria-label="Medir distancia"
          onClick={() =>
            setMeasureMode(
              measureMode === 'distance' ? null : 'distance'
            )
          }
        >
          ↔
        </button>

        <button
          className={`map-tool-btn ${measureMode === 'area' ? 'active' : ''}`}
          title="Medir área"
          aria-label="Medir área"
          onClick={() =>
            setMeasureMode(
              measureMode === 'area' ? null : 'area'
            )
          }
        >
          ▱
        </button>

        <button
          className="map-tool-btn danger"
          title="Limpiar medición"
          aria-label="Limpiar medición"
          onClick={clear}
        >
          ×
        </button>
      </div>

      {(measureMode || measureResult) && (
        <div className="measure-panel">
          <strong>
            {measureMode === 'area'
              ? 'Medición de área'
              : measureMode === 'distance'
              ? 'Medición de distancia'
              : 'Resultado'}
          </strong>
          <p>{measureResult}</p>
        </div>
      )}
    </>
  )
}
