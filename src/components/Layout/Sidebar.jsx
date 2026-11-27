import {useEffect,useState} from 'react'
import {bbox} from '@turf/turf'
import Icon from '../Common/Icon'
import LayerController from '../Map/LayerController'
import ResponsiveDrawer from './ResponsiveDrawer'
import {useMapContext} from '../../context/MapContext'
import {useWorkspace} from '../../context/WorkspaceContext'
import {api,logAction} from '../../services/api'
import {useAuth} from '../../context/AuthContext'
const MAP_STYLES={
  streets:'mapbox://styles/mapbox/streets-v12',
  satellite:'mapbox://styles/mapbox/satellite-streets-v12',
  relief:'mapbox://styles/mapbox/outdoors-v12'
}
const TERRAIN_SOURCE='geomax-relief-dem'
const MENU=[['resumen','dashboard','Resumen'],['urbanizaciones','urbanizations','Gestión de urbanizaciones'],['lotes','layers','Gestión de lotes'],['puntos','location','Puntos de interés'],['cotizaciones','quotes','Cotizaciones'],['reportes','reports','Reportes'],['bitacora','audit','Bitácora']]
export default function Sidebar(){
  const {user}=useAuth()
  const {sidebarOpen,baseMap,setBaseMap,map,setSelectedFeature,lotesRevision}=useMapContext()
  const {module,open}=useWorkspace()
  const [urbanizaciones,setUrbanizaciones]=useState([]),[error,setError]=useState(''),[selectedId,setSelectedId]=useState(null)
  useEffect(()=>{let active=true;api('/urbanizaciones').then(d=>{if(active){setUrbanizaciones(d.features);setError('')}}).catch(e=>{if(active)setError(e.message)});return()=>{active=false}},[lotesRevision])
  const goToUrbanization=f=>{
    try{const [w,s,e,n]=bbox(f);setSelectedId(f.properties.id);setSelectedFeature(null);map?.fitBounds([[w,s],[e,n]],{padding:70,maxZoom:18.35,duration:800});logAction('consulta_urbanizacion',f.properties.nombre,f.properties.id)}catch(e){setError(e.message)}
  }
  // El relieve usa el estilo exterior y un modelo digital de elevación (Mapbox Terrain DEM).
  // El estilo normal se restaura sin conservar la inclinación ni el terreno anterior.
  useEffect(()=>{
    if(!map)return
    const configureTerrain=()=>{
      if(baseMap!=='relief'||!map.isStyleLoaded())return
      if(!map.getSource(TERRAIN_SOURCE)){
        map.addSource(TERRAIN_SOURCE,{
          type:'raster-dem',
          url:'mapbox://mapbox.mapbox-terrain-dem-v1',
          tileSize:512,
          maxzoom:14
        })
      }
      map.setTerrain({source:TERRAIN_SOURCE,exaggeration:1.25})
    }
    map.on('style.load',configureTerrain)
    if(map.isStyleLoaded())configureTerrain()
    return()=>map.off('style.load',configureTerrain)
  },[map,baseMap])
  const changeBaseMap=k=>{
    if(!MAP_STYLES[k]||k===baseMap)return
    setBaseMap(k)
    if(map){
      if(map.getTerrain())map.setTerrain(null)
      map.setStyle(MAP_STYLES[k])
      map.easeTo({pitch:k==='relief'?55:0,duration:600})
    }
    logAction('cambio_vista',k)
  }
  const goModule=key=>{open(key)}
  return <>
    <aside className={`sidebar gm-sidebar ${sidebarOpen?'':'closed'}`} aria-label="Opciones del geovisor">
      <div className="gm-sidebar-content">
        <section className="gm-sidebar-section"><h2><Icon name="urbanizations" size={17}/> Urbanizaciones</h2><div className="gm-urbanizations">{urbanizaciones.map(f=><button key={f.properties.id} type="button" className={`gm-urbanization ${selectedId===f.properties.id?'active':''}`} onClick={()=>goToUrbanization(f)}>{f.properties.nombre}</button>)}{error&&<p className="gm-empty">{error}</p>}{!error&&!urbanizaciones.length&&<p className="gm-empty">Sin urbanizaciones registradas.</p>}</div></section>
        <div className="gm-sidebar-layer"><LayerController/></div>
        <section className="gm-sidebar-section"><h2><Icon name="map" size={17}/> Vistas</h2><div className="gm-views" role="group" aria-label="Tipo de mapa">{[['streets','Calles'],['satellite','Satélite'],['relief','Relieve']].map(([k,label])=><button type="button" key={k} className={baseMap===k?'active':''} aria-pressed={baseMap===k} onClick={()=>changeBaseMap(k)}>{label}</button>)}</div></section>
        <section className="gm-sidebar-section gm-sidebar-legend"><h2>Estado de lotes</h2><div><span className="gm-dot sold"/> Vendidos</div><div><span className="gm-dot reserved"/> Reservados</div><div><span className="gm-dot available"/> Disponibles</div><div><span className="gm-dot pending"/> Por confirmar</div></section>
        <section className="gm-sidebar-section gm-sidebar-functions"><h2><Icon name="settings" size={17}/> Módulos de GeoMax</h2><div className="gm-menu-links">{MENU.map(([k,ic,label])=><button key={k} className={module===k?'active':''} type="button" onClick={()=>goModule(k)}><Icon name={ic} size={16}/>{label}</button>)}{user.rol==='admin'&&<button type="button" className={module==='usuarios'?'active':''} onClick={()=>goModule('usuarios')}><Icon name="users" size={16}/> Usuarios y permisos</button>}</div></section>
      </div>
    </aside>
    <ResponsiveDrawer open={sidebarOpen}/>
  </>
}
