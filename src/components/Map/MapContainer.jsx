import { useEffect, useRef, useState } from 'react'
import ReactDOM from 'react-dom/client'
import mapboxgl from 'mapbox-gl'
import { bbox } from '@turf/turf'
import useMapbox from '../../hooks/useMapbox'
import useLayers from '../../hooks/useLayers'
import PopupInfo from './PopupInfo'
import LotPriceEditor from './LotPriceEditor'
import FloatingActions from '../Layout/FloatingActions'
import MapDrawing from './MapDrawing'
import {useWorkspace} from '../../context/WorkspaceContext'
import MeasurementTools from '../Tools/MeasurementTools'
import { useAuth } from '../../context/AuthContext'
import { api, logAction } from '../../services/api'
import { useMapContext } from '../../context/MapContext'

export default function MapContainer() {
  const containerRef = useRef(null)
  const [activeLot, setActiveLot] = useState(null)
  const [priceEditor, setPriceEditor] = useState(null)

  useMapbox(containerRef)
  useLayers()

  const { map, setSelectedFeature, measureMode, actualizarLotes } = useMapContext()
  const {user}=useAuth()
  const {drawing,open,openLotEditor}=useWorkspace()

  useEffect(() => {
    if (!map) return

    let popup = null
    let popupRoot = null

    const showPopup = (feature, lngLat) => {
      popup?.remove()
      popupRoot?.unmount()
      popup = null
      popupRoot = null

      const node = document.createElement('div')
      popupRoot = ReactDOM.createRoot(node)
      const isLot=!!feature.properties?.estado
      popupRoot.render(<PopupInfo properties={feature.properties}
        canEdit={isLot && (user.rol==='admin'||user.rol==='editor')}
        canRevertSale={user.rol==='admin'}
        onOpenManager={openLotEditor}
        onChangeStatus={async(id,estado,operacion)=>{
          const result=await api(`/lots/${id}`,{method:'PATCH',body:{estado,operacion}})
          actualizarLotes()
          return result
        }}/>)

      popup = new mapboxgl.Popup({
        closeButton: true,
        closeOnClick: true,
        maxWidth: '370px'
      })
        .setLngLat(lngLat)
        .setDOMContent(node)
        .addTo(map)
    }

    const interactiveLayers = () =>
      ['lotes-fill', 'puntos-unclustered']
        .filter(layerId => map.getLayer(layerId))

    const handleClick = event => {
      if (measureMode || drawing) return

      const layers = interactiveLayers()
      if (!layers.length) return

      const features = map.queryRenderedFeatures(event.point, { layers })
      const feature = features[0]
      if (!feature) return

      if (feature.layer.id === 'lotes-fill') {
        popup?.remove()
        popupRoot?.unmount()
        popup = null
        popupRoot = null
        setSelectedFeature(feature)
        setActiveLot({properties: feature.properties, version: Date.now()})
        // Enfocar el lote dentro del espacio visible y fuera de la ficha lateral.
        try {
          const [west, south, east, north] = bbox(feature)
          if ([west, south, east, north].every(Number.isFinite)) {
            const canvasWidth = map.getCanvas().clientWidth
            map.fitBounds([[west, south], [east, north]], {
              padding: canvasWidth > 900
                ? {top: 65, bottom: 65, left: Math.min(620, canvasWidth * 0.52), right: 65}
                : 55,
              maxZoom: 20,
              duration: 850,
              essential: true
            })
          }
        } catch (error) {
          if (import.meta.env.DEV) console.warn('GeoMax: no se pudo acercar al lote', error)
        }
        logAction('consulta_lote', feature.properties?.codigo || '', feature.properties?.id || '')
      }

      if (feature.layer.id === 'puntos-unclustered') {
        setActiveLot(null)
        showPopup(feature, feature.geometry.coordinates)
      }
    }

    const handleMove = event => {
      if (measureMode || drawing) return

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
  }, [map, setSelectedFeature, measureMode, drawing, user, actualizarLotes, open, openLotEditor])

  const token = import.meta.env.VITE_MAPBOX_TOKEN?.trim()
  const missingToken = !token || token === 'pega_aqui_tu_token_publico_de_mapbox'

  return (
    <div className="map-root">
      <div ref={containerRef} className="map-canvas" />

      {activeLot && (
        <section className="gm-map-inspector" aria-label={`Información del lote ${activeLot.properties?.codigo || ''}`}>
          <button
            type="button"
            className="gm-map-inspector__close"
            aria-label="Cerrar información del lote"
            onClick={() => {setActiveLot(null);setSelectedFeature(null)}}
          >×</button>
          <PopupInfo
            key={`${activeLot.properties.id}-${activeLot.version}`}
            properties={activeLot.properties}
            canEdit={user.rol === 'admin' || user.rol === 'editor'}
            canRevertSale={user.rol === 'admin'}
            onOpenManager={id => {setPriceEditor({id,properties:activeLot.properties});setActiveLot(null)}}
            onChangeStatus={async (id, estado, operacion) => {
              const result = await api(`/lots/${id}`, {method:'PATCH',body:{estado,operacion}})
              actualizarLotes()
              if(result?.feature?.properties){
                setActiveLot(previous => previous?.properties?.id === id
                  ? {...previous, properties: result.feature.properties}
                  : previous)
              }
              return result
            }}
          />
        </section>
      )}

      {priceEditor && (
        <LotPriceEditor
          lotId={priceEditor.id}
          initialProperties={priceEditor.properties}
          onClose={() => {
            setActiveLot({properties:priceEditor.properties,version:Date.now()})
            setPriceEditor(null)
          }}
          onSaved={feature => {
            actualizarLotes()
            setSelectedFeature(feature)
            setActiveLot({properties:feature.properties,version:Date.now()})
            setPriceEditor(null)
          }}
        />
      )}

      {missingToken && (
        <div className="map-message">
          <div className="map-message-card">
            <strong>Token de Mapbox no configurado</strong>
            <p>
              Crea un archivo <code>.env</code> en la raíz del proyecto y define
              <code> VITE_MAPBOX_TOKEN</code> siguiendo la configuración de
              <code> .env.example</code>.
            </p>
          </div>
        </div>
      )}

      <MeasurementTools showToolbar={false} />
      <MapDrawing />
      <FloatingActions />
    </div>
  )
}
