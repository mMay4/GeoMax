import { createContext, useContext, useMemo, useState } from 'react'

const MapContext = createContext(null)

export function MapProvider({ children }) {
  const [map, setMap] = useState(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [baseMap, setBaseMap] = useState('streets')
  const [selectedFeature, setSelectedFeature] = useState(null)
  const [measureMode, setMeasureMode] = useState(null)
  const [measureResult, setMeasureResult] = useState(null)
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
    layerVisibility, setLayerVisibility
  }), [
    map, sidebarOpen, baseMap, selectedFeature,
    measureMode, measureResult, layerVisibility
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
