import { useEffect, useRef } from 'react'
import { useMapContext } from '../context/MapContext'
import { api } from '../services/api'

const LOT_STATUS_COLOR = [
  'match', ['get', 'estado'],
  'disponible', '#10B981',
  'reservado', '#F59E0B',
  'vendido', '#EF4444',
  'pendiente', '#777777',
  '#6B7280'
]

const EMPTY_COLLECTION = { type: 'FeatureCollection', features: [] }
const DATASETS = ['urbanizaciones', 'lotes', 'puntos', 'areas']

function setVisibility(map, visibility) {
  const groups = [
    ['urbanizaciones', ['urbanizaciones-fill', 'urbanizaciones-line']],
    ['lotes', ['lotes-fill', 'lotes-line', 'lotes-selected', 'lotes-labels']],
    ['puntos', ['clusters', 'cluster-count', 'puntos-unclustered']],
    ['areas', ['areas-protected-fill', 'areas-protected-line']]
  ]
  for (const [key, ids] of groups) {
    for (const id of ids) {
      if (map.getLayer(id)) {
        map.setLayoutProperty(id, 'visibility', (key === 'areas' ? (visibility.urbanizaciones || visibility.lotes) : visibility[key]) ? 'visible' : 'none')
      }
    }
  }
}

function setSelected(map, selectedFeature) {
  if (!map.getLayer('lotes-selected')) return
  map.setFilter('lotes-selected', ['==', ['get', 'id'], selectedFeature?.properties?.id ?? '__none__'])
}

// Las fuentes y capas se recrean tras cada style.load; setStyle las elimina.
function installGeoLayers(map, data, visibility, selectedFeature) {
  if (!data || !map.getStyle()) return

  for (const name of DATASETS) {
    const existing = map.getSource(name)
    if (existing) {
      existing.setData(data[name] || EMPTY_COLLECTION)
    } else {
      map.addSource(name, {
        type: 'geojson',
        data: data[name] || EMPTY_COLLECTION,
        ...(name === 'puntos' ? { cluster: true, clusterMaxZoom: 14, clusterRadius: 45 } : {})
      })
    }
  }

  const ensureLayer = (layer) => {
    if (!map.getLayer(layer.id)) map.addLayer(layer)
  }
  // Vías, áreas verdes y equipamiento: capa consultiva; no existe ruta API de edición.
  ensureLayer({
    id: 'areas-protected-fill', type: 'fill', source: 'areas',
    paint: {
      'fill-color': ['match',['get','tipo'],
        'via','#A3A3A3','area_verde','#308056','area_equipamiento','#FAD006',
        'equipamiento','#FAD006','#A3A3A3'],
      'fill-opacity': 0.34
    }
  })
  ensureLayer({
    id: 'areas-protected-line', type: 'line', source: 'areas',
    paint: { 'line-color': ['match',['get','tipo'],
      'area_verde','#308056','area_equipamiento','#B98D00','equipamiento','#B98D00','#777777'],
      'line-width': 1.4 }
  })
  ensureLayer({
    id: 'urbanizaciones-fill', type: 'fill', source: 'urbanizaciones',
    paint: { 'fill-color': '#FC8801', 'fill-opacity': 0.08 }
  })
  ensureLayer({
    id: 'urbanizaciones-line', type: 'line', source: 'urbanizaciones',
    paint: { 'line-color': '#308056', 'line-width': 2.5 }
  })
  ensureLayer({
    id: 'lotes-fill', type: 'fill', source: 'lotes',
    paint: { 'fill-color': LOT_STATUS_COLOR, 'fill-opacity': 0.55 }
  })
  ensureLayer({
    id: 'lotes-line', type: 'line', source: 'lotes',
    paint: { 'line-color': '#FFFFFF', 'line-width': 1.1 }
  })
  ensureLayer({
    id: 'lotes-labels', type: 'symbol', source: 'lotes', minzoom: 17.5,
    layout: {
      'text-field': ['get', 'codigo'], 'text-size': 10,
      'text-allow-overlap': false, 'text-anchor': 'center'
    },
    paint: {
      'text-color': '#FFFFFF', 'text-halo-color': '#8E2B20', 'text-halo-width': 1.2
    }
  })
  ensureLayer({
    id: 'lotes-selected', type: 'line', source: 'lotes',
    filter: ['==', ['get', 'id'], '__none__'],
    paint: { 'line-color': '#F59E0B', 'line-width': 4 }
  })
  ensureLayer({
    id: 'clusters', type: 'circle', source: 'puntos',
    filter: ['has', 'point_count'],
    paint: {
      'circle-color': '#308056',
      'circle-radius': ['step', ['get', 'point_count'], 17, 10, 23, 30, 29],
      'circle-stroke-color': '#FFFFFF', 'circle-stroke-width': 2
    }
  })
  ensureLayer({
    id: 'cluster-count', type: 'symbol', source: 'puntos',
    filter: ['has', 'point_count'],
    layout: { 'text-field': ['get', 'point_count_abbreviated'], 'text-size': 12 },
    paint: { 'text-color': '#FFFFFF' }
  })
  ensureLayer({
    id: 'puntos-unclustered', type: 'circle', source: 'puntos',
    filter: ['!', ['has', 'point_count']],
    paint: {
      'circle-color': [
        'match', ['get', 'tipo'],
        'colegio', '#308056', 'salud', '#EF4444', 'transporte', '#F59E0B', '#308056'
      ],
      'circle-radius': 7, 'circle-stroke-color': '#FFFFFF', 'circle-stroke-width': 2
    }
  })
  setVisibility(map, visibility)
  setSelected(map, selectedFeature)
}

export default function useLayers() {
  const { map, layerVisibility, selectedFeature, lotesRevision } = useMapContext()
  const dataRef = useRef(null)
  const visibilityRef = useRef(layerVisibility)
  const selectedRef = useRef(selectedFeature)
  visibilityRef.current = layerVisibility
  selectedRef.current = selectedFeature

  useEffect(() => {
    if (!map) return undefined
    dataRef.current = null
    const restore = () => {
      if (!dataRef.current) return
      try {
        installGeoLayers(map, dataRef.current, visibilityRef.current, selectedRef.current)
      } catch (error) {
        // El estilo puede estar reemplazándose en este instante: reintentar al estar listo.
        if (import.meta.env.DEV) console.warn('GeoMax: restaurando capas cartográficas', error)
      }
    }
    map.on('style.load', restore)
    // En algunos equipos style.load ocurre antes de terminar de cargar los datos.
    // Al quedar inactivo el mapa, se asegura la restauración que esté pendiente.
    const restoreIfMissing = () => {
      if (dataRef.current && !map.getSource('lotes')) restore()
    }
    map.on('idle', restoreIfMissing)
    return () => {
      map.off('style.load', restore)
      map.off('idle', restoreIfMissing)
      dataRef.current = null
    }
  }, [map])

  useEffect(() => {
    if (!map) return undefined
    let active = true
    const refresh = async () => {
      try {
        const [urbanizaciones, lotes, puntos, areas] = await Promise.all([
          api('/urbanizaciones'), api('/lots'), api('/puntos'), api('/areas')
        ])
        if (!active) return
        dataRef.current = { urbanizaciones, lotes, puntos, areas }
        try {
          installGeoLayers(map, dataRef.current, visibilityRef.current, selectedRef.current)
        } catch (error) {
          // Si setStyle está en curso, el listener style.load lo restaurará.
          if (import.meta.env.DEV) console.warn('GeoMax: esperando estilo del mapa', error)
        }
      } catch (error) {
        if (active) console.error('GeoMax: no se pudieron cargar las capas', error)
      }
    }
    refresh()
    return () => { active = false }
  }, [map, lotesRevision])

  useEffect(() => {
    if (!map || !map.getSource('lotes')) return
    try {
      setVisibility(map, layerVisibility)
      setSelected(map, selectedFeature)
    } catch (error) {
      if (import.meta.env.DEV) console.warn('GeoMax: actualización de capas pendiente', error)
    }
  }, [map, layerVisibility, selectedFeature])
}
