import { useEffect, useRef } from 'react'
import mapboxgl from 'mapbox-gl'
import { useMapContext } from '../context/MapContext'

export const SUCRE_CENTER = [-65.23361412, -19.12381079]
export const INITIAL_ZOOM = 17.15 // Karapanza de Corazón III

export default function useMapbox(containerRef) {
  const mapRef = useRef(null)
  const { setMap } = useMapContext()

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const token = import.meta.env.VITE_MAPBOX_TOKEN?.trim()
    if (!token || token === 'pega_aqui_tu_token_publico_de_mapbox') return

    mapboxgl.accessToken = token

    const isMobile = window.matchMedia('(max-width: 900px), (pointer: coarse)').matches

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/satellite-streets-v12',
      center: SUCRE_CENTER,
      zoom: INITIAL_ZOOM,
      pitch: 0,
      bearing: 0,
      attributionControl: true,
      antialias: !isMobile,
      preserveDrawingBuffer: false
    })

    if (isMobile) {
      map.dragRotate.disable()
      map.touchZoomRotate.disableRotation()
      map.boxZoom.disable()
    }

    map.addControl(
      new mapboxgl.NavigationControl({
        showCompass: !isMobile,
        visualizePitch: false
      }),
      'bottom-right'
    )

    map.addControl(
      new mapboxgl.GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: true,
        showUserHeading: true
      }),
      'bottom-right'
    )

    map.once('load', () => setMap(map))
    mapRef.current = map

    const observer = new ResizeObserver(() => map.resize())
    observer.observe(containerRef.current)

    return () => {
      observer.disconnect()
      setMap(null)
      map.remove()
      mapRef.current = null
    }
  }, [containerRef, setMap])

  return mapRef
}
