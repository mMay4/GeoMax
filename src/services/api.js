const KEY='geomax_access_token'
export const getToken=()=>sessionStorage.getItem(KEY)
export const setToken=value=>value?sessionStorage.setItem(KEY,value):sessionStorage.removeItem(KEY)
export async function api(path,{method='GET',body,auth=true}={}){
  const headers={}
  if(body!==undefined)headers['Content-Type']='application/json'
  if(auth&&getToken())headers.Authorization=`Bearer ${getToken()}`
  let response
  try{response=await fetch(`/api${path}`,{method,headers,body:body===undefined?undefined:JSON.stringify(body),cache:'no-store'})}
  catch{throw new Error('No se pudo conectar con la API. Ejecuta npm run dev para iniciar GeoMax.')}
  let data={}
  try{data=await response.json()}catch{throw new Error('Respuesta inesperada del servidor.')}
  if(!response.ok)throw new Error(data.error||`Error ${response.status}`)
  return data
}
export const logAction=(accion,detalle='',referencia='')=>
  api('/audit',{method:'POST',body:{accion,detalle,referencia}}).catch(error=>console.warn('Bitácora:',error.message))
