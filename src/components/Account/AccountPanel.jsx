import {useEffect,useState} from 'react'
import {useAuth} from '../../context/AuthContext'
import AuditPanel from '../Modules/AuditPanel'
import UsersPanel from '../Modules/UsersPanel'
import Icon from '../Common/Icon'
import {useWorkspace} from '../../context/WorkspaceContext'
export default function AccountPanel({onClose}){
  const {user,logout}=useAuth()
  const {close}=useWorkspace()
  const [tab,setTab]=useState('bitacora')
  useEffect(()=>{
    const onEsc=e=>{if(e.key==='Escape')onClose()}
    window.addEventListener('keydown',onEsc)
    return()=>window.removeEventListener('keydown',onEsc)
  },[onClose])
  const exit=async()=>{close();await logout();onClose()}
  return <div className="account-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}>
    <section className="account-panel" role="dialog" aria-modal="true" aria-label="Mi cuenta y bitácora">
      <div className="account-head"><div><small>GEOMAX · MAX INVERSIONES</small><h2>Mi cuenta</h2></div><button type="button" onClick={onClose} className="account-close" aria-label="Cerrar panel"><Icon name="close" size={21}/></button></div>
      <div className="account-profile"><div className="account-avatar">{user.nombre.slice(0,1).toUpperCase()}</div><div><strong>{user.nombre}</strong><span>@{user.usuario} · {user.rol==='lector'?'Consulta':user.rol==='admin'?'Administrador':'Editor'}</span><small className="account-status">Cuenta {user.activo?'activa':'inactiva'}</small></div></div>
      <nav className="account-tabs"><button type="button" className={tab==='bitacora'?'active':''} onClick={()=>setTab('bitacora')}>Mi bitácora</button>{user.rol==='admin'&&<button type="button" className={tab==='usuarios'?'active':''} onClick={()=>setTab('usuarios')}>Usuarios</button>}</nav>
      <div className="account-scroll gm-account-content">{tab==='bitacora'?<AuditPanel compact/>:<UsersPanel/>}</div>
      <div className="account-foot"><button type="button" className="account-logout" onClick={exit}><Icon name="logout" size={16}/> Cerrar sesión</button><button type="button" className="account-secondary" onClick={onClose}>Volver al mapa</button></div>
    </section>
  </div>
}
