import {useEffect,useState} from 'react'
import {api} from '../../services/api'
import Icon from '../Common/Icon'
export default function UsersPanel(){
  const [users,setUsers]=useState([])
  const [form,setForm]=useState({nombre:'',usuario:'',contrasena:'',rol:'lector'})
  const [editId,setEditId]=useState(null)
  const [edits,setEdits]=useState({nombre:'',rol:'lector',activo:true,contrasena:''})
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('')
  const load=()=>api('/users').then(d=>setUsers(d.users)).catch(e=>setError(e.message))
  useEffect(()=>{load()},[])
  const submit=async e=>{
    e.preventDefault();setBusy(true);setError('');setNotice('')
    try{await api('/users',{method:'POST',body:form});await load();setForm({nombre:'',usuario:'',contrasena:'',rol:'lector'});setNotice('Cuenta creada. La nueva persona ya puede iniciar sesión.')}
    catch(err){setError(err.message)}finally{setBusy(false)}
  }
  const edit=u=>{setEditId(u.id);setEdits({nombre:u.nombre,rol:u.rol,activo:u.activo,contrasena:''});setError('');setNotice('')}
  const save=async e=>{
    e.preventDefault();setBusy(true);setError('');setNotice('')
    try{await api('/users/'+editId,{method:'PATCH',body:edits});await load();setEditId(null);setNotice('Datos y permisos actualizados. Se registró el cambio en la bitácora.')}
    catch(err){setError(err.message)}finally{setBusy(false)}
  }
  return <div className="gm-stack">
    <p className="gm-muted">Solo los administradores pueden registrar usuarios y cambiar permisos. Las contraseñas se guardan protegidas.</p>
    <form className="gm-form gm-form-card" onSubmit={submit} autoComplete="off"><h3>Registrar usuario</h3>
      <label>Nombre completo<input required minLength={3} value={form.nombre} onChange={e=>setForm({...form,nombre:e.target.value})}/></label>
      <label>Nombre de usuario<input required minLength={3} value={form.usuario} onChange={e=>setForm({...form,usuario:e.target.value})}/></label>
      <label>Contraseña (mínimo 10 caracteres)<input required minLength={10} type="password" autoComplete="new-password" value={form.contrasena} onChange={e=>setForm({...form,contrasena:e.target.value})}/></label>
      <label>Rol<select value={form.rol} onChange={e=>setForm({...form,rol:e.target.value})}><option value="lector">Consulta</option><option value="editor">Editor</option><option value="admin">Administrador</option></select></label>
      <button className="gm-primary" type="submit" disabled={busy}><Icon name="add" size={16}/> Crear cuenta</button>
    </form>
    <h3>Personal registrado ({users.length})</h3>
    <div className="gm-list">{users.map(u=><div className="gm-user-card" key={u.id}>
      <div className="gm-row-wrap"><div><strong>{u.nombre}</strong><small>@{u.usuario} · {u.rol} · {u.activo?'Activo':'Inactivo'}</small></div><button className="gm-secondary" onClick={()=>edit(u)}><Icon name="edit" size={15}/> Editar</button></div>
      {editId===u.id&&<form className="gm-form" onSubmit={save}>
        <label>Nombre<input required minLength={3} value={edits.nombre} onChange={e=>setEdits({...edits,nombre:e.target.value})}/></label>
        <label>Rol<select value={edits.rol} onChange={e=>setEdits({...edits,rol:e.target.value})}><option value="lector">Consulta</option><option value="editor">Editor</option><option value="admin">Administrador</option></select></label>
        <label>Restablecer contraseña (opcional)<input type="password" minLength={10} value={edits.contrasena} placeholder="Dejar vacío si no cambia" onChange={e=>setEdits({...edits,contrasena:e.target.value})}/></label>
        <label className="gm-checkbox"><input type="checkbox" checked={edits.activo} onChange={e=>setEdits({...edits,activo:e.target.checked})}/> Cuenta activa</label>
        <div className="gm-inline-actions"><button type="submit" className="gm-primary" disabled={busy}>Guardar</button><button type="button" className="gm-secondary" onClick={()=>setEditId(null)}>Cancelar</button></div>
      </form>}
    </div>)}</div>
    {error&&<p className="gm-error" role="alert">{error}</p>}
    {notice&&<p className="gm-success" role="status">{notice}</p>}
  </div>
}
