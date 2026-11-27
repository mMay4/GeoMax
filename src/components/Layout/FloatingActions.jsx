import Icon from '../Common/Icon'
import {useMapContext} from '../../context/MapContext'
import {useWorkspace} from '../../context/WorkspaceContext'
import {SUCRE_CENTER, INITIAL_ZOOM} from '../../hooks/useMapbox'
const EMPTY={type:'FeatureCollection',features:[]}
export default function FloatingActions(){
  const {map,measureMode,setMeasureMode,setMeasureResult,setSelectedFeature}=useMapContext()
  const {open,drawing}=useWorkspace()
  const activate=mode=>{if(drawing)return;setMeasureMode(measureMode===mode?null:mode)}
  const resetMeasurement=()=>{setMeasureMode(null);setMeasureResult(null);map?.getSource('geomax-medicion')?.setData(EMPTY)}
  const home=()=>{setSelectedFeature(null);map?.flyTo({center:SUCRE_CENTER,zoom:INITIAL_ZOOM,pitch:0,bearing:0,essential:true})}
  const items=[
    {name:'distance',label:'Medir distancia A–B',click:()=>activate('distance'),active:measureMode==='distance'},
    {name:'area',label:'Medir superficie',click:()=>activate('area'),active:measureMode==='area'},
    {name:'clear',label:'Limpiar mediciones',click:resetMeasurement},
    {name:'separator'},
    {name:'location',label:'Gestionar puntos de interés',click:()=>open('puntos')},
    {name:'layers',label:'Gestionar lotes',click:()=>open('lotes')},
    {name:'reports',label:'Reportes',click:()=>open('reportes')},
    {name:'home',label:'Volver al mapa inicial',click:home}
  ]
  return <div className="gm-floating-actions" role="toolbar" aria-label="Herramientas cartográficas">{items.map((item,i)=>item.name==='separator'?<div className="gm-floating-divider" key={i}/>:<button key={item.name} type="button" onClick={item.click} aria-label={item.label} title={item.label} className={item.active?'active':''} aria-pressed={!!item.active}><Icon name={item.name} size={20}/></button>)}</div>
}
