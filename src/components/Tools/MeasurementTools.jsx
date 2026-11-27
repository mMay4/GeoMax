import {useEffect,useRef} from 'react'
import * as turf from '@turf/turf'
import {useMapContext} from '../../context/MapContext'
import {logAction} from '../../services/api'

const SOURCE='geomax-medicion'
const lineLayer='geomax-medicion-linea'
const fillLayer='geomax-medicion-area'
const outlineLayer='geomax-medicion-borde'
const pointsLayer='geomax-medicion-puntos'
const labelLayer='geomax-medicion-etiquetas'
const empty=()=>({type:'FeatureCollection',features:[]})
function addLayers(map){
  if(!map.isStyleLoaded())return
  if(!map.getSource(SOURCE))map.addSource(SOURCE,{type:'geojson',data:empty()})
  if(!map.getLayer(fillLayer))map.addLayer({id:fillLayer,type:'fill',source:SOURCE,filter:['==',['geometry-type'],'Polygon'],paint:{'fill-color':'#FAD006','fill-opacity':0.22}})
  if(!map.getLayer(outlineLayer))map.addLayer({id:outlineLayer,type:'line',source:SOURCE,filter:['==',['geometry-type'],'Polygon'],paint:{'line-color':'#FC8801','line-width':2.5}})
  if(!map.getLayer(lineLayer))map.addLayer({id:lineLayer,type:'line',source:SOURCE,filter:['==',['geometry-type'],'LineString'],paint:{'line-color':'#FC8801','line-width':4,'line-dasharray':[2,1]}})
  if(!map.getLayer(pointsLayer))map.addLayer({id:pointsLayer,type:'circle',source:SOURCE,filter:['==',['geometry-type'],'Point'],paint:{'circle-color':'#308056','circle-radius':7,'circle-stroke-color':'#ffffff','circle-stroke-width':2}})
  if(!map.getLayer(labelLayer))map.addLayer({id:labelLayer,type:'symbol',source:SOURCE,filter:['==',['geometry-type'],'Point'],layout:{'text-field':['get','punto'],'text-size':13,'text-offset':[0,-1.5],'text-allow-overlap':true},paint:{'text-color':'#308056','text-halo-color':'#ffffff','text-halo-width':2}})
}
function featureData(coordinates,mode){
  const features=coordinates.map((coord,index)=>turf.point(coord,{punto:mode==='distance'?(index===0?'A':'B'):String(index+1)}))
  if(mode==='distance'&&coordinates.length===2)features.push(turf.lineString(coordinates))
  if(mode==='area'&&coordinates.length>=3)features.push(turf.polygon([[...coordinates,coordinates[0]]]))
  else if(mode==='area'&&coordinates.length>=2)features.push(turf.lineString(coordinates))
  return {type:'FeatureCollection',features}
}
const formatDistance=meters=>meters<1000?`${meters.toFixed(1)} m`:`${(meters/1000).toFixed(3)} km`
const formatArea=meters=>meters<10000?`${meters.toFixed(1)} m²`:`${(meters/10000).toFixed(3)} ha`

export default function MeasurementTools({showToolbar = true}){
  const {map,measureMode,setMeasureMode,measureResult,setMeasureResult}=useMapContext()
  const draft=useRef({coordinates:[],mode:'distance'})
  const draw=()=>{
    if(!map||!map.isStyleLoaded())return
    addLayers(map)
    map.getSource(SOURCE)?.setData(featureData(draft.current.coordinates,draft.current.mode))
  }
  // Restaurar puntos y líneas incluso después de cambiar a Satélite o Relieve.
  useEffect(()=>{
    if(!map)return
    const onStyle=()=>draw()
    if(map.isStyleLoaded())onStyle()
    map.on('style.load',onStyle)
    return()=>map.off('style.load',onStyle)
  },[map])
  useEffect(()=>{
    if(!map||!measureMode)return
    draft.current={coordinates:[],mode:measureMode}
    draw()
    setMeasureResult(measureMode==='distance'?'Selecciona el punto A y luego el punto B en el mapa.':'Haz clic en tres o más vértices y pulsa «Finalizar área».')
    const canvas=map.getCanvas()
    canvas.style.cursor='crosshair'
    const click=e=>{
      const coord=[e.lngLat.lng,e.lngLat.lat]
      const arr=draft.current.coordinates
      if(arr.length&&turf.distance(turf.point(arr[arr.length-1]),turf.point(coord),{units:'meters'})<0.1)return
      if(measureMode==='distance'&&arr.length>=2)return
      arr.push(coord)
      draw()
      if(measureMode==='distance'){
        if(arr.length===1){setMeasureResult('Punto A definido. Haz clic en el punto B.')}
        else {
          const meters=turf.distance(turf.point(arr[0]),turf.point(arr[1]),{units:'meters'})
          const result=formatDistance(meters)
          setMeasureResult(`Distancia A → B: ${result} (línea recta)`)
          logAction('medicion_distancia',`A: ${arr[0].map(v=>v.toFixed(6)).join(', ')} · B: ${arr[1].map(v=>v.toFixed(6)).join(', ')} · ${result}`)
          setMeasureMode(null)
        }
      }else setMeasureResult(`Vértices marcados: ${arr.length}. ${arr.length>=3?'Puedes finalizar el área.':'Faltan puntos.'}`)
    }
    map.on('click',click)
    return()=>{
      map.off('click',click)
      if(map.getCanvas())map.getCanvas().style.cursor=''
    }
  },[map,measureMode,setMeasureMode,setMeasureResult])
  const start=mode=>{
    if(measureMode===mode){setMeasureMode(null);return}
    setMeasureMode(mode)
  }
  const finishArea=()=>{
    const arr=draft.current.coordinates
    if(measureMode!=='area'||arr.length<3){setMeasureResult('Marca al menos 3 puntos antes de finalizar.');return}
    const squareMeters=turf.area(turf.polygon([[...arr,arr[0]]]))
    const result=formatArea(squareMeters)
    setMeasureResult(`Superficie delimitada: ${result}`)
    logAction('medicion_superficie',`${arr.length} vértices · ${result}`)
    setMeasureMode(null)
  }
  const clear=()=>{
    draft.current={coordinates:[],mode:'distance'}
    if(map?.isStyleLoaded()&&map.getSource(SOURCE))map.getSource(SOURCE).setData(empty())
    setMeasureMode(null)
    setMeasureResult(null)
  }
  return <>
    {showToolbar && <div className="map-toolbar geomax-tools">
      <button type="button" className={`map-tool-btn ${measureMode==='distance'?'active':''}`} title="Medir punto A a punto B" aria-label="Medir distancia de A a B" onClick={()=>start('distance')}>↔</button>
      <button type="button" className={`map-tool-btn ${measureMode==='area'?'active':''}`} title="Medir superficie" aria-label="Medir superficie" onClick={()=>start('area')}>▱</button>
      <button type="button" className="map-tool-btn danger" title="Limpiar medición" aria-label="Limpiar medición" onClick={clear}>×</button>
    </div>}
    {(measureMode||measureResult)&&<div className="measure-panel geomax-measure-panel" role="status">
      <strong>{measureMode==='distance'?'Medir distancia A → B':measureMode==='area'?'Medir superficie':'Resultado de la medición'}</strong>
      <p>{measureResult}</p>
      {measureMode==='area'&&<button type="button" onClick={finishArea}>Finalizar área</button>}
      {measureResult&&!measureMode&&<button type="button" className="measure-again" onClick={()=>start(draft.current.mode)}>Nueva medición</button>}
    </div>}
  </>
}
