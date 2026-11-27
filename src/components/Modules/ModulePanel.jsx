import {useWorkspace} from '../../context/WorkspaceContext'
import Icon from '../Common/Icon'
import DashboardPanel from './DashboardPanel'
import CatalogManager from './CatalogManager'
import ReportsPanel from './ReportsPanel'
import QuotesPanel from './QuotesPanel'
import AuditPanel from './AuditPanel'
import UsersPanel from './UsersPanel'
import {useAuth} from '../../context/AuthContext'
const modules={
  resumen:['dashboard','Resumen general'],
  urbanizaciones:['urbanizations','Urbanizaciones'],
  lotes:['layers','Gestión de lotes'],
  puntos:['location','Puntos de interés'],
  cotizaciones:['quotes','Cotizaciones'],
  reportes:['reports','Reportes'],
  bitacora:['audit','Bitácora'],
  usuarios:['users','Usuarios y permisos']
}
export default function ModulePanel(){
  const {module,close,requestedLotId,clearRequestedLotId}=useWorkspace()
  const {user}=useAuth()
  if(!module)return null
  if(!modules[module])return null
  if(module==='usuarios' && user.rol!=='admin')return null
  const [icon,title]=modules[module]
  return <aside className="gm-module-panel" role="dialog" aria-modal="false" aria-label={title}>
    <div className="gm-module-head">
      <span className="gm-module-icon"><Icon name={icon} size={20}/></span>
      <div><small>MAX INVERSIONES · GEOMAX</small><h2>{title}</h2></div>
      <button className="gm-icon-btn" type="button" title="Cerrar módulo" aria-label="Cerrar módulo" onClick={close}><Icon name="close" size={20}/></button>
    </div>
    <div className="gm-module-content" key={module}>
      {module==='resumen' && <DashboardPanel/>}
      {module==='urbanizaciones' && <CatalogManager type="urbanizaciones"/>}
      {module==='lotes' && <CatalogManager type="lotes" requestedLotId={requestedLotId} clearRequestedLotId={clearRequestedLotId}/>}
      {module==='puntos' && <CatalogManager type="puntos"/>}
      {module==='cotizaciones' && <QuotesPanel/>}
      {module==='reportes' && <ReportsPanel/>}
      {module==='bitacora' && <AuditPanel/>}
      {module==='usuarios' && <UsersPanel/>}
    </div>
  </aside>
}
