import {useEffect,useMemo,useState} from 'react'
import {api} from '../../services/api'
import {dateBO,downloadCsv} from '../../utils/export'
import {useAuth} from '../../context/AuthContext'
import Icon from '../Common/Icon'
export const AUDIT_LABELS={
  creacion_cuenta_inicial:'Creación de administrador',inicio_sesion:'Inicio de sesión',cierre_sesion:'Cierre de sesión',
  creacion_usuario:'Nuevo usuario',modificacion_usuario:'Modificación de usuario',
  medicion_distancia:'Medición de distancia',medicion_superficie:'Medición de superficie',
  consulta_lote:'Consulta de lote',consulta_urbanizacion:'Consulta de urbanización',consulta_poi:'Consulta de punto de interés',
  busqueda:'Búsqueda',cambio_vista:'Cambio de vista',cambio_capa:'Cambio de capas',
  exportar_lotes:'Exportación de lotes',exportar_reporte:'Exportación de reporte',consulta_reporte:'Consulta de reporte',
  creacion_urbanizaciones:'Nueva urbanización',modificacion_urbanizaciones:'Urbanización modificada',eliminacion_urbanizaciones:'Urbanización eliminada',
  creacion_lotes:'Nuevo lote',modificacion_lotes:'Lote modificado',eliminacion_lotes:'Lote eliminado',cambio_estado_lote:'Cambio de estado de lote',
  creacion_puntos:'Nuevo punto de interés',modificacion_puntos:'Punto modificado',eliminacion_puntos:'Punto eliminado',
  creacion_cotizacion:'Cotización creada',consulta_cotizacion:'Cotización consultada'
}
export default function AuditPanel({compact=false}){
  const {user}=useAuth(),[scope,setScope]=useState('me'),[entries,setEntries]=useState([])
  const [search,setSearch]=useState(''),[action,setAction]=useState('all'),[error,setError]=useState('')
  const [loading,setLoading]=useState(false)
  const load=()=>{setLoading(true);api(`/audit?scope=${scope}&limit=500`).then(d=>{setEntries(d.entries);setError('')}).catch(e=>setError(e.message)).finally(()=>setLoading(false))}
  useEffect(()=>{load()},[scope])
  const actions=useMemo(()=>Array.from(new Set(entries.map(a=>a.accion))).sort(),[entries])
  const filtered=useMemo(()=>entries.filter(a=>{
    const hay=[a.usuario,a.nombre,a.detalle,a.accion,a.referencia,AUDIT_LABELS[a.accion]].join(' ').toLocaleLowerCase('es-BO')
    return (action==='all'||a.accion===action)&&hay.includes(search.toLocaleLowerCase('es-BO'))
  }),[entries,search,action])
  const exportCsv=()=>downloadCsv('GeoMax_Bitacora.csv',['Fecha','Usuario','Acción','Detalle','Referencia'],filtered.map(a=>[dateBO(a.fecha),a.usuario,AUDIT_LABELS[a.accion]||a.accion,a.detalle,a.referencia]))
  return <div className="gm-stack">
    {!compact&&<p className="gm-muted">Movimientos de GeoMax registrados con fecha, cuenta y módulo afectado.</p>}
    <div className="gm-row-wrap">
      {user.rol==='admin'&&<select aria-label="Ámbito de la bitácora" value={scope} onChange={e=>setScope(e.target.value)}><option value="me">Mis movimientos</option><option value="all">Todo el equipo</option></select>}
      <button type="button" className="gm-secondary" onClick={load} disabled={loading}><Icon name="refresh" size={15}/>{loading?'Actualizando…':'Actualizar'}</button>
    </div>
    <input aria-label="Buscar movimientos" placeholder="Buscar usuario, acción o detalle…" value={search} onChange={e=>setSearch(e.target.value)}/>
    <select aria-label="Filtrar tipo de actividad" value={action} onChange={e=>setAction(e.target.value)}><option value="all">Todas las actividades</option>{actions.map(a=><option key={a} value={a}>{AUDIT_LABELS[a]||a}</option>)}</select>
    <div className="gm-row-wrap"><span className="gm-muted">{filtered.length} movimientos</span><button className="gm-secondary" onClick={exportCsv}><Icon name="download" size={15}/> Exportar CSV</button></div>
    <div className="gm-audit-list">{filtered.map(a=><article key={a.id}><span className="gm-audit-circle"/><div><strong>{AUDIT_LABELS[a.accion]||a.accion}</strong><small>{dateBO(a.fecha)} · @{a.usuario}</small>{a.detalle&&<p>{a.detalle}</p>}{a.referencia&&<small>Referencia: {a.referencia}</small>}</div></article>)}{!filtered.length&&<p className="gm-muted">No hay movimientos con los filtros seleccionados.</p>}</div>
    {error&&<p className="gm-error" role="alert">{error}</p>}
  </div>
}
