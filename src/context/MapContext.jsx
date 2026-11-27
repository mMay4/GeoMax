import { createContext, useCallback, useContext, useMemo, useState } from 'react'

const MapContext = createContext(null)

export function MapProvider({ children }) {
  const [map, setMap] = useState(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [baseMap, setBaseMap] = useState('satellite')
  const [selectedFeature, setSelectedFeature] = useState(null)
  const [measureMode, setMeasureMode] = useState(null)
  const [measureResult, setMeasureResult] = useState(null)
  const [lotesRevision, setLotesRevision] = useState(0)
  const actualizarLotes = useCallback(() => setLotesRevision(v => v + 1), [])
  const actualizarDatos = actualizarLotes
  const [layerVisibility, setLayerVisibility] = useState({
    urbanizaciones: true,
    lotes: true,
    puntos: true
  })

  const value = useMemo(() => ({
    map, setMap,
    sidebarOpen, setSidebarOpen,
    baseMap, setBaseMap,
    selectedFeature, setSelectedFeature,
    measureMode, setMeasureMode,
    measureResult, setMeasureResult,
    lotesRevision, actualizarLotes, actualizarDatos,
    layerVisibility, setLayerVisibility
  }), [
    map, sidebarOpen, baseMap, selectedFeature,
    measureMode, measureResult, layerVisibility, lotesRevision
  ])

  return <MapContext.Provider value={value}>{children}</MapContext.Provider>
}

export function useMapContext() {
  const context = useContext(MapContext)
  if (!context) {
    throw new Error('useMapContext debe utilizarse dentro de MapProvider')
  }
  return context
}
