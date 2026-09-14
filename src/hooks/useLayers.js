import { useEffect } from 'react'
import { useMapContext } from '../context/MapContext'
import { loadGeoJSON } from '../services/geojsonService'

const LOT_STATUS_COLOR = [
  'match',
  ['get', 'estado'],
  'disponible', '#10B981',
  'reservado', '#F59E0B',
  'vendido', '#EF4444',
  '#6B7280'
]

function applyVisibility(map, ids, visible) {
  ids.forEach(id => {
    if (map.getLayer(id)) {
      map.setLayoutProperty(id, 'visibility', visible ? 'visible' : 'none')
    }
  })
}

export default function useLayers() {
  const { map, layerVisibility, selectedFeature } = useMapContext()

  useEffect(() => {
    if (!map) return
    let cancelled = false

    const loadAndAdd = async () => {
      if (!map.isStyleLoaded()) return

      const [urbanizaciones, lotes, puntos] = await Promise.all([
        loadGeoJSON('/data/urbanizaciones.geojson'),
        loadGeoJSON('/data/lotes.geojson'),
        loadGeoJSON('/data/puntos-interes.geojson')
      ])

      if (cancelled) return

      if (!map.getSource('urbanizaciones')) {
        map.addSource('urbanizaciones', { type: 'geojson', data: urbanizaciones })
      }
      if (!map.getLayer('urbanizaciones-fill')) {
        map.addLayer({
          id: 'urbanizaciones-fill',
          type: 'fill',
          source: 'urbanizaciones',
          paint: {
            'fill-color': '#3B82F6',
            'fill-opacity': 0.08
          }
        })
      }
      if (!map.getLayer('urbanizaciones-line')) {
        map.addLayer({
          id: 'urbanizaciones-line',
          type: 'line',
          source: 'urbanizaciones',
          paint: {
            'line-color': '#1E3A8A',
            'line-width': 2.5
          }
        })
      }

      if (!map.getSource('lotes')) {
        map.addSource('lotes', {
          type: 'geojson',
          data: lotes
        })
      }
      if (!map.getLayer('lotes-fill')) {
        map.addLayer({
          id: 'lotes-fill',
          type: 'fill',
          source: 'lotes',
          paint: {
            'fill-color': LOT_STATUS_COLOR,
            'fill-opacity': 0.55
          }
        })
      }
      if (!map.getLayer('lotes-line')) {
        map.addLayer({
          id: 'lotes-line',
          type: 'line',
          source: 'lotes',
          paint: {
            'line-color': '#FFFFFF',
            'line-width': 1.1
          }
        })
      }
      if (!map.getLayer('lotes-selected')) {
        map.addLayer({
          id: 'lotes-selected',
          type: 'line',
          source: 'lotes',
          filter: ['==', ['get', 'id'], '__none__'],
          paint: {
            'line-color': '#F59E0B',
            'line-width': 4
          }
        })
      }

      if (!map.getSource('puntos')) {
        map.addSource('puntos', {
          type: 'geojson',
          data: puntos,
          cluster: true,
          clusterMaxZoom: 14,
          clusterRadius: 45
        })
      }
      if (!map.getLayer('clusters')) {
        map.addLayer({
          id: 'clusters',
          type: 'circle',
          source: 'puntos',
          filter: ['has', 'point_count'],
          paint: {
            'circle-color': '#1E3A8A',
            'circle-radius': [
              'step',
              ['get', 'point_count'],
              17,
              10, 23,
              30, 29
            ],
            'circle-stroke-color': '#FFFFFF',
            'circle-stroke-width': 2
          }
        })
      }
      if (!map.getLayer('cluster-count')) {
        map.addLayer({
          id: 'cluster-count',
          type: 'symbol',
          source: 'puntos',
          filter: ['has', 'point_count'],
          layout: {
            'text-field': ['get', 'point_count_abbreviated'],
            'text-size': 12
          },
          paint: {
            'text-color': '#FFFFFF'
          }
        })
      }
      if (!map.getLayer('puntos-unclustered')) {
        map.addLayer({
          id: 'puntos-unclustered',
          type: 'circle',
          source: 'puntos',
          filter: ['!', ['has', 'point_count']],
          paint: {
            'circle-color': [
              'match',
              ['get', 'tipo'],
              'colegio', '#3B82F6',
              'salud', '#EF4444',
              'transporte', '#F59E0B',
              '#1E3A8A'
            ],
            'circle-radius': 7,
            'circle-stroke-color': '#FFFFFF',
            'circle-stroke-width': 2
          }
        })
      }

      applyVisibility(
        map,
        ['urbanizaciones-fill', 'urbanizaciones-line'],
        layerVisibility.urbanizaciones
      )
      applyVisibility(
        map,
        ['lotes-fill', 'lotes-line', 'lotes-selected'],
        layerVisibility.lotes
      )
      applyVisibility(
        map,
        ['clusters', 'cluster-count', 'puntos-unclustered'],
        layerVisibility.puntos
      )

      if (map.getLayer('lotes-selected')) {
        const selectedId = selectedFeature?.properties?.id ?? '__none__'
        map.setFilter('lotes-selected', ['==', ['get', 'id'], selectedId])
      }
    }

    const safeLoad = () => loadAndAdd().catch(console.error)

    if (map.isStyleLoaded()) safeLoad()
    map.on('style.load', safeLoad)

    return () => {
      cancelled = true
      map.off('style.load', safeLoad)
    }
  }, [map, layerVisibility, selectedFeature])

  useEffect(() => {
    if (!map || !map.isStyleLoaded()) return

    applyVisibility(
      map,
      ['urbanizaciones-fill', 'urbanizaciones-line'],
      layerVisibility.urbanizaciones
    )
    applyVisibility(
      map,
      ['lotes-fill', 'lotes-line', 'lotes-selected'],
      layerVisibility.lotes
    )
    applyVisibility(
      map,
      ['clusters', 'cluster-count', 'puntos-unclustered'],
      layerVisibility.puntos
    )
  }, [map, layerVisibility])
}
