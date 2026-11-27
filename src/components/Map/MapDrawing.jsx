import {useEffect} from 'react'
import {useMapContext} from '../../context/MapContext'
import {useWorkspace} from '../../context/WorkspaceContext'
import Icon from '../Common/Icon'
const SOURCE='gm-edicion-geo'
const EMPTY={type:'FeatureCollection',features:[]}
export default function MapDrawing(){
  const {map}=useMapContext()
  const {drawing,drawPoints,addPoint,finishDrawing,cancelDrawing}=useWorkspace()
  useEffect(()=>{
    if(!map||!drawing)return
    const canvas=map.getCanvas();canvas.style.cursor='crosshair'
    const click=e=>addPoint([Number(e.lngLat.lng.toFixed(7)),Number(e.lngLat.lat.toFixed(7))])
    map.on('click',click)
    return()=>{map.off('click',click);canvas.style.cursor=''}
  },[map,drawing,addPoint])
  useEffect(()=>{
    if(!map)return
    const draw=()=>{
      if(!map.isStyleLoaded())return
      if(!map.getSource(SOURCE))map.addSource(SOURCE,{type:'geojson',data:EMPTY})
      if(!map.getLayer('gm-edicion-fill'))map.addLayer({id:'gm-edicion-fill',type:'fill',source:SOURCE,filter:['==',['geometry-type'],'Polygon'],paint:{'fill-color':'#FAD006','fill-opacity':.22}})
      if(!map.getLayer('gm-edicion-line'))map.addLayer({id:'gm-edicion-line',type:'line',source:SOURCE,filter:['==',['geometry-type'],'LineString'],paint:{'line-color':'#FC8801','line-width':3,'line-dasharray':[2,1]}})
      if(!map.getLayer('gm-edicion-dot'))map.addLayer({id:'gm-edicion-dot',type:'circle',source:SOURCE,filter:['==',['geometry-type'],'Point'],paint:{'circle-color':'#308056','circle-radius':6,'circle-stroke-color':'#fff','circle-stroke-width':2}})
      const features=drawPoints.map(pt=>({type:'Feature',geometry:{type:'Point',coordinates:pt},properties:{}}))
      if(drawPoints.length>=2)features.push({type:'Feature',geometry:{type:'LineString',coordinates:drawPoints},properties:{}})
      if(drawing==='polygon'&&drawPoints.length>=3)features.push({type:'Feature',geometry:{type:'Polygon',coordinates:[[...drawPoints,drawPoints[0]]]},properties:{}})
      map.getSource(SOURCE).setData({type:'FeatureCollection',features})
    }
    if(map.isStyleLoaded())draw()
    map.on('style.load',draw)
    return()=>map.off('style.load',draw)
  },[map,drawing,drawPoints])
  if(!drawing)return null
  return <div className="gm-map-drawing" role="status">
    <strong><Icon name="edit" size={17}/> {drawing==='polygon'?'Dibuja el polígono':'Marca el punto en el mapa'}</strong>
    <p>{drawing==='polygon'?`Haz clic sobre el mapa para marcar cada vértice. ${drawPoints.length} seleccionados.`:'Haz clic sobre el mapa para definir la ubicación.'}</p>
    <div className="gm-inline-actions">
      <button type="button" onClick={finishDrawing} disabled={drawing==='polygon'?drawPoints.length<3:drawPoints.length<1}><Icon name="check" size={15}/> Usar geometría</button>
      <button type="button" className="muted" onClick={cancelDrawing}>Cancelar</button>
    </div>
  </div>
}
