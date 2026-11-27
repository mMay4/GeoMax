import {useMapContext} from '../../context/MapContext'
import {logAction} from '../../services/api'
import Icon from '../Common/Icon'
const LAYERS=[
  {key:'urbanizaciones',label:'Urbanizaciones',color:'#308056'},
  {key:'lotes',label:'Lotes',color:'#10B981'},
  {key:'puntos',label:'Puntos de interés',color:'#FC8801'}
]
export default function LayerController(){
  const {layerVisibility,setLayerVisibility}=useMapContext()
  const toggle=key=>{const next=!layerVisibility[key];setLayerVisibility(prev=>({...prev,[key]:next}));logAction('cambio_capa',`${key}: ${next?'visible':'oculta'}`)}
  return <section className="section-card"><h2 className="section-title"><Icon name="layers" size={17}/> Capas</h2>{LAYERS.map(layer=><div className="layer-row" key={layer.key}><div className="layer-label"><span className="swatch" style={{background:layer.color}}/>{layer.label}</div><button type="button" className={`switch ${layerVisibility[layer.key]?'on':''}`} onClick={()=>toggle(layer.key)} aria-pressed={layerVisibility[layer.key]} aria-label={`${layerVisibility[layer.key]?'Ocultar':'Mostrar'} ${layer.label}`}><span/></button></div>)}</section>
}
