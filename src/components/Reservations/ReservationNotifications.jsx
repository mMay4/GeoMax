import {useEffect,useRef,useState} from 'react'
import {useAuth} from '../../context/AuthContext'
import {useMapContext} from '../../context/MapContext'
import {useWorkspace} from '../../context/WorkspaceContext'
import {api} from '../../services/api'
import Icon from '../Common/Icon'
import {expiredMessage,formatDate,whatsappUrl} from '../../utils/reservas'

export default function ReservationNotifications(){
  const {user}=useAuth(),{actualizarLotes}=useMapContext(),{open}=useWorkspace()
  const canManage=user?.rol==='admin'||user?.rol==='editor'
  const [show,setShow]=useState(false),[items,setItems]=useState([])
  const [loading,setLoading]=useState(false),[error,setError]=useState('')
  const initialized=useRef(false),last=useRef('')
  useEffect(()=>{
    if(!canManage)return undefined
    let active=true
    const poll=async()=>{
      try{
        const data=await api('/notifications')
        if(!active)return
        setItems(data.notifications)
        const signature=data.notifications.map(x=>x.id).join(',')
        if(initialized.current&&signature!==last.current)actualizarLotes()
        initialized.current=true
        last.current=signature
        setError('')
      }catch(e){if(active)setError(e.message)}
    }
    poll()
    const interval=setInterval(poll,10000)
    return()=>{active=false;clearInterval(interval)}
  },[canManage,actualizarLotes])
  // Las notificaciones de reservas requieren autorización comercial.
  if (!canManage) return null
  const unread=items.filter(n=>!n.leida).length
  const mark=async note=>{
    setLoading(true)
    try{
      await api(`/notifications/${note.id}/read`,{method:'POST'})
      setItems(prev=>prev.map(n=>n.id===note.id?{...n,leida:true}:n))
    }catch(e){setError(e.message)}finally{setLoading(false)}
  }
  return <div className="gm-notifications">
    <button className="gm-notification-button" type="button" aria-label={`Notificaciones de reservas, ${unread} sin leer`} aria-expanded={show} onClick={()=>setShow(s=>!s)} title="Reservas vencidas">
      <Icon name="bell" size={19}/>{unread>0&&<span className="gm-notification-counter">{unread>99?'99+':unread}</span>}
    </button>
    {show&&<section className="gm-notification-panel" aria-label="Notificaciones de reservas">
      <div className="gm-notification-title"><strong>Notificaciones de reservas</strong><button type="button" onClick={()=>setShow(false)} aria-label="Cerrar notificaciones"><Icon name="close" size={16}/></button></div>
      {error&&<p className="gm-error" role="alert">{error}</p>}
      {!items.length&&<p className="gm-muted">No hay reservas vencidas registradas.</p>}
      <div className="gm-notification-items">{items.map(n=>{
        const url=whatsappUrl(n.contacto?.numero,expiredMessage(n))
        return <article key={n.id} className={n.leida?'gm-notification-read':'gm-notification-unread'}>
          <strong>{n.codigo} · {n.urbanizacion}</strong>
          <small>{formatDate(n.fecha)} · {n.leida?'Leída':'Nueva'}</small>
          <p>{n.mensaje}</p>
          {n.contacto&&<small>Contacto: {n.contacto.nombre} {n.contacto.apellido}</small>}
          <div className="gm-notification-actions">
            {url&&<a href={url} target="_blank" rel="noopener noreferrer"><Icon name="message" size={15}/> Preparar WhatsApp</a>}
            <button type="button" onClick={()=>{open('lotes');setShow(false)}}>Ver lotes</button>
            {!n.leida&&<button type="button" disabled={loading} onClick={()=>mark(n)}>Marcar leída</button>}
          </div>
        </article>
      })}</div>
    </section>}
  </div>
}
