import {useState} from 'react'
import '../../styles/login.css'
import TopographicBackground from './TopographicBackground'
import {useAuth} from '../../context/AuthContext'

/** Pantalla original naranja y verde: estructura visual preservada. */
export default function Login(){
  const {login,needsSetup,connectionError}=useAuth()
  const [usuario,setUsuario]=useState('')
  const [contrasena,setContrasena]=useState('')
  const [nombre,setNombre]=useState('')
  const [confirmar,setConfirmar]=useState('')
  const [error,setError]=useState('')
  const [busy,setBusy]=useState(false)
  const handleSubmit=async e=>{
    e.preventDefault()
    setError('')
    if(needsSetup&&contrasena!==confirmar){setError('Las contraseñas no coinciden.');return}
    setBusy(true)
    try{await login(usuario.trim(),contrasena,nombre.trim())}
    catch(err){setError(err.message)}
    finally{setBusy(false)}
  }
  return <main className="login-page">
    <TopographicBackground/>
    <div className="login-vignette" aria-hidden="true"/>
    <section className="login-card">
      <h1 className="login-title">GEOMAX</h1>
      <div className="login-logo"><img src="/assets/imagenes/logo-max.png" alt="Logo de MAX Inversiones"/></div>
      {needsSetup&&<p className="login-intro">Primera configuración · crea la cuenta administradora</p>}
      <form className="login-form" onSubmit={handleSubmit}>
        {needsSetup&&<><label className="sr-only" htmlFor="registro-nombre">Nombre completo</label><input id="registro-nombre" autoComplete="name" placeholder="Nombre completo" value={nombre} onChange={e=>setNombre(e.target.value)} required minLength={3}/></>}
        <label className="sr-only" htmlFor="login-usuario">Usuario</label>
        <input id="login-usuario" type="text" placeholder="Usuario" autoComplete="username" value={usuario} onChange={e=>setUsuario(e.target.value)} required/>
        <label className="sr-only" htmlFor="login-contrasena">Contraseña</label>
        <input id="login-contrasena" type="password" placeholder={needsSetup?'Contraseña (mínimo 10 caracteres)':'Contraseña'} autoComplete={needsSetup?'new-password':'current-password'} value={contrasena} onChange={e=>setContrasena(e.target.value)} required minLength={needsSetup?10:1}/>
        {needsSetup&&<><label className="sr-only" htmlFor="registro-confirmar">Confirmar contraseña</label><input id="registro-confirmar" type="password" placeholder="Confirmar contraseña" autoComplete="new-password" value={confirmar} onChange={e=>setConfirmar(e.target.value)} required minLength={10}/></>}
        {(error||connectionError)&&<p className="login-error" role="alert">{error||connectionError}</p>}
        <button type="submit" className="login-button" disabled={busy}>{busy?'PROCESANDO…':needsSetup?'CREAR ADMINISTRADOR':'INGRESAR'}</button>
      </form>
      <p className="login-footer">MAX INVERSIONES · GEOVISOR</p>
    </section>
  </main>
}
