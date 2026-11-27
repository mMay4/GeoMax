import {useState} from 'react'
import {bbox} from '@turf/turf'
import Icon from '../Common/Icon'
import ReservationNotifications from '../Reservations/ReservationNotifications'
import {useMapContext} from '../../context/MapContext'
import {useAuth} from '../../context/AuthContext'
import {api,logAction} from '../../services/api'
import {geocodeSucre} from '../../services/geojsonService'
export default function Header({onAccountClick}){
  const {user}=useAuth()
  const {map,sidebarOpen,setSidebarOpen,setSelectedFeature}=useMapContext()
  const [query,setQuery]=useState(''),[results,setResults]=useState([])
  const [loading,setLoading]=useState(false),[error,setError]=useState('')
  const search=async e=>{
    e?.preventDefault()
    if(!query.trim()||loading)return
    setLoading(true);setError('')
    try{
      const found=await api('/search?q='+encodeURIComponent(query.trim()))
      const remote=await geocodeSucre(query,import.meta.env.VITE_MAPBOX_TOKEN).catch(()=>[])
      const items=[...found.results.map(f=>({...f,internal:true,place_name:`${f.nombre} · ${f.tipo}`})),...remote]
      setResults(items.slice(0,10))
      if(!items.length)setError('No se encontraron resultados.')
      logAction('busqueda',query.trim())
    }catch(err){setError(err.message);setResults([])}finally{setLoading(false)}
  }
  const selectResult=item=>{
    if(item.internal){
      const feature={type:'Feature',geometry:item.geometry,properties:item.properties}
      if(item.geometry?.type==='Point')map?.flyTo({center:item.geometry.coordinates,zoom:16,essential:true})
      else if(item.geometry){
        const [w,s,e,n]=bbox(feature)
        map?.fitBounds([[w,s],[e,n]],{padding:80,maxZoom:item.tipo==='lotes'?20:17,duration:700})
      }
      if(item.tipo==='lotes')setSelectedFeature(feature)
    }else map?.flyTo({center:item.center,zoom:16,essential:true})
    setQuery(item.place_name);setResults([]);setError('')
  }
  return <header className="header gm-header">
    <div className="gm-header-brand"><button type="button" className="gm-header-menu" onClick={()=>setSidebarOpen(!sidebarOpen)} title={sidebarOpen?'Ocultar menú':'Mostrar menú'} aria-label="Alternar menú"><Icon name="menu" size={21}/></button><strong>GEOMAX</strong><span className="gm-header-subtitle">MAX INVERSIONES</span></div>
    <form className="gm-search" role="search" onSubmit={search}>
      <div className="gm-search-field"><Icon name="search" size={17}/><input value={query} onChange={e=>{setQuery(e.target.value);setError('')}} placeholder="Buscar en GeoMax o coordenadas…" aria-label="Buscar ubicación o lote"/><button type="submit" disabled={loading}>{loading?'…':'Buscar'}</button></div>
      {(results.length>0||error)&&<div className="gm-search-results" role="status">{error&&<p>{error}</p>}{results.map((item,index)=><button key={item.id+'-'+index} type="button" onClick={()=>selectResult(item)}>{item.place_name}</button>)}</div>}
    </form>
    <button type="button" className="gm-header-account" onClick={onAccountClick} title={`Mi cuenta: ${user.nombre}`}><Icon name="user" size={18}/><span>Mi cuenta</span></button>
    <ReservationNotifications/>
  </header>
}
