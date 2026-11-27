import {createContext,useContext,useEffect,useState} from 'react'
import {api,getToken,setToken} from '../services/api'
const AuthContext=createContext(null)
export function AuthProvider({children}){
  const [user,setUser]=useState(null)
  const [booting,setBooting]=useState(true)
  const [needsSetup,setNeedsSetup]=useState(false)
  const [connectionError,setConnectionError]=useState('')
  useEffect(()=>{
    let active=true
    ;(async()=>{
      try{
        const setup=await api('/auth/setup',{auth:false})
        if(!active)return
        setNeedsSetup(setup.needsSetup)
        if(getToken()){
          try{const me=await api('/auth/me');if(active)setUser(me.user)}
          catch{setToken(null)}
        }
        setConnectionError('')
      }catch(e){if(active)setConnectionError(e.message)}
      finally{if(active)setBooting(false)}
    })()
    return()=>{active=false}
  },[])
  const login=async(usuario,contrasena,nombre)=>{
    const isFirst=needsSetup
    const data=await api(isFirst?'/auth/setup':'/auth/login',{
      auth:false,method:'POST',body:{usuario,contrasena,...(isFirst?{nombre}:{})}
    })
    setToken(data.token)
    setUser(data.user)
    setNeedsSetup(false)
    setConnectionError('')
  }
  const logout=async()=>{
    try{await api('/auth/logout',{method:'POST'})}catch(e){console.warn(e.message)}
    setToken(null)
    setUser(null)
  }
  const value={user,booting,needsSetup,connectionError,login,logout}
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
export function useAuth(){const v=useContext(AuthContext);if(!v)throw new Error('AuthProvider requerido');return v}
