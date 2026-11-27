import {useEffect,useState} from 'react'
import Icon from '../Common/Icon'
import {api} from '../../services/api'
import {useWorkspace} from '../../context/WorkspaceContext'
import {useAuth} from '../../context/AuthContext'
import {useMapContext} from '../../context/MapContext'
export default function DashboardPanel(){
  const [data,setData]=useState(null),[error,setError]=useState('')
  const {open}=useWorkspace(),{user}=useAuth()
  const {lotesRevision}=useMapContext()
  useEffect(()=>{api('/summary').then(setData).catch(e=>setError(e.message))},[lotesRevision])
  if(error)return <p className="gm-error">{error}</p>
  if(!data)return <p className="gm-muted">Cargando resumen…</p>
  return <div className="gm-stack">
    <p className="gm-muted">Bienvenido, <strong>{user.nombre}</strong>. Información actual del geovisor.</p>
    <div className="gm-stats">
      {[['Urbanizaciones',data.urbanizaciones],['Lotes',data.lotes],['Puntos de interés',data.puntos],['Cotizaciones',data.cotizaciones]].map(([k,v])=><div key={k}><small>{k}</small><strong>{v}</strong></div>)}
    </div>
    <h3>Disponibilidad de lotes</h3>
    <div className="gm-status-summary">
      {[['disponible','Disponible'],['reservado','Reservado'],['vendido','Vendido'],['pendiente','Por confirmar']].map(([key,label])=><div key={key}><span className={'gm-status-bullet '+key}/><span>{label}</span><strong>{data.estados[key]}</strong></div>)}
    </div>
    <h3>Accesos rápidos</h3>
    <div className="gm-quick-links">
      {[['lotes','layers','Gestionar lotes'],['urbanizaciones','urbanizations','Urbanizaciones'],['reportes','reports','Ver reportes'],['bitacora','audit','Bitácora']].map(([key,ico,title])=><button key={key} onClick={()=>open(key)}><Icon name={ico} size={17}/>{title}</button>)}
    </div>
  </div>
}
