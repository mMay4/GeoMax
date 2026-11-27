import {useEffect,useMemo,useState} from 'react'
import {bbox} from '@turf/turf'
import {api} from '../../services/api'
import {useAuth} from '../../context/AuthContext'
import {useMapContext} from '../../context/MapContext'
import {useWorkspace} from '../../context/WorkspaceContext'
import {money,statusLabel} from '../../utils/export'
import Icon from '../Common/Icon'
import OperationFields,{emptyOperation,operationPayload} from '../Reservations/OperationFields'
import Countdown from '../Reservations/Countdown'
import {calcularFinanciamiento,formatExactoBoliviano} from '../../utils/financing'
import {formatDate,whatsappUrl} from '../../utils/reservas'
const CONFIG={
  urbanizaciones:{label:'urbanización',plural:'urbanizaciones',newButton:'Nueva urbanización'},
  lotes:{label:'lote',plural:'lotes',newButton:'Nuevo lote'},
  puntos:{label:'punto de interés',plural:'puntos',newButton:'Nuevo punto'}
}
function initial(type,urbanizations){
  if(type==='urbanizaciones')return {nombre:'',descripcion:'',geometry:null}
  if(type==='puntos')return {nombre:'',tipo:'otro',descripcion:'',geometry:null}
  return {codigo:'',urbanizacion:urbanizations[0]?.properties?.nombre||'',estado:'disponible',superficie_m2:'',precio:'',precio_usd:'',cuota_inicial_usd:'',plazo_meses:'',tipo_cambio:'7',promocion:'',vigencia_cotizacion_dias:'',fecha_venta:'',servicios:[],manzano:'',observaciones:'',geometry:null}
}
export default function CatalogManager({type,requestedLotId=null,clearRequestedLotId=()=>{}}){
  const {user}=useAuth(),{map,setSelectedFeature,actualizarDatos,lotesRevision}=useMapContext()
  const {captured,setCaptured,beginDrawing}=useWorkspace()
  const [list,setList]=useState([]),[urbanizations,setUrbanizations]=useState([])
  const [filter,setFilter]=useState(''),[stateFilter,setStateFilter]=useState('todos')
  const [form,setForm]=useState(null),[editingId,setEditingId]=useState(null)
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('')
  const [history,setHistory]=useState([])
  const [originalState,setOriginalState]=useState('disponible')
  const [operation,setOperation]=useState(emptyOperation)
  const [lotOperations,setLotOperations]=useState([])
  const canEdit=user.rol==='admin'||user.rol==='editor'
  const admin=user.rol==='admin'
  const config=CONFIG[type]
  const load=async()=>{
    const [collection, urb]=await Promise.all([api('/'+type),api('/urbanizaciones')])
    setList(collection.features)
    setUrbanizations(urb.features)
  }
  useEffect(()=>{let alive=true;Promise.all([api('/'+type),api('/urbanizaciones')]).then(([d,u])=>{if(alive){setList(d.features);setUrbanizations(u.features)}}).catch(e=>{if(alive)setError(e.message)});return()=>{alive=false}},[type,lotesRevision])
  useEffect(()=>{
    if(!captured||!form)return
    setForm(f=>({...f,geometry:captured}))
    setCaptured(null)
    setNotice('Geometría capturada. Revisa los datos y guarda el registro.')
  },[captured,form,setCaptured])
  const financingPreview=useMemo(()=>{
    if(type!=='lotes'||!form)return null
    const fields=['precio_usd','cuota_inicial_usd','plazo_meses','tipo_cambio']
    if(fields.some(k=>form[k]===null||form[k]===undefined||form[k]===''))return null
    try{return {result:calcularFinanciamiento(form)}}
    catch(e){return {error:e.message}}
  },[type,form?.precio_usd,form?.cuota_inicial_usd,form?.plazo_meses,form?.tipo_cambio])
  const filtered=useMemo(()=>list.filter(f=>{
    const p=f.properties
    const text=[p.nombre,p.codigo,p.urbanizacion,p.manzano,p.tipo].join(' ').toLowerCase()
    return text.includes(filter.toLowerCase()) && (type!=='lotes'||stateFilter==='todos'||p.estado===stateFilter)
  }),[list,filter,stateFilter,type])
  const startNew=()=>{setForm(initial(type,urbanizations));setEditingId(null);setOriginalState('disponible');setOperation(emptyOperation());setLotOperations([]);setError('');setNotice('');setHistory([])}
  const edit=f=>{
    setEditingId(f.properties.id)
    setForm({...f.properties,tipo_cambio:f.properties.tipo_cambio||'7',geometry:f.geometry})
    setOriginalState(f.properties.estado||'disponible')
    setOperation(emptyOperation());setLotOperations([])
    setError('');setNotice('')
    if(type==='lotes'){
      api(`/lots/${f.properties.id}/history`).then(d=>setHistory(d.entries)).catch(()=>setHistory([]))
      api('/lot-operations?lotId='+encodeURIComponent(f.properties.id)).then(d=>{
        setLotOperations(d.operations)
        const recent=d.operations[0]
        if(recent?.persona)setOperation(old=>({...old,...recent.persona}))
      }).catch(()=>setLotOperations([]))
    }else setHistory([])
  }
  useEffect(()=>{
    if(type!=='lotes'||!requestedLotId||!list.length)return
    const selected=list.find(f=>String(f.properties.id)===String(requestedLotId))
    if(!selected)return
    if(canEdit)edit(selected)
    else {setFilter(selected.properties.codigo||'');setStateFilter('todos')}
    clearRequestedLotId()
  },[type,requestedLotId,list,canEdit,clearRequestedLotId])
  const focus=f=>{
    try{
      if(f.geometry.type==='Point')map?.flyTo({center:f.geometry.coordinates,zoom:16,essential:true})
      else {
        const [w,s,e,n]=bbox(f)
        map?.fitBounds([[w,s],[e,n]],{padding:80,maxZoom:17,duration:700})
      }
      setSelectedFeature(type==='lotes'?f:null)
    }catch(e){setError(e.message)}
  }
  const submit=async e=>{
    e.preventDefault();setError('');setNotice('')
    if(!form?.geometry){setError('Debes dibujar o importar una geometría antes de guardar.');return}
    setBusy(true)
    try{
      const path='/'+type+(editingId?'/'+editingId:'')
      const payload={...form, geometry:form.geometry}
      if(type==='lotes'){
        if(form.estado!==(editingId?originalState:'disponible') && ['reservado','vendido'].includes(form.estado))
          payload.operacion=operationPayload(operation,form.estado)
        payload.superficie_m2=form.superficie_m2===''?null:Number(form.superficie_m2)
        payload.precio=form.precio===''?null:Number(form.precio)
        payload.precio_usd=(form.precio_usd??'').toString().trim()
        payload.cuota_inicial_usd=(form.cuota_inicial_usd??'').toString().trim()
        payload.plazo_meses=form.plazo_meses===''||form.plazo_meses===null||form.plazo_meses===undefined?null:Number(form.plazo_meses)
        payload.tipo_cambio=form.tipo_cambio||'7'
        payload.promocion=(form.promocion??'').toString().trim()
        payload.vigencia_cotizacion_dias=form.estado==='reservado'&&form.vigencia_cotizacion_dias!==''&&form.vigencia_cotizacion_dias!==null&&form.vigencia_cotizacion_dias!==undefined?Number(form.vigencia_cotizacion_dias):null
        payload.fecha_venta=form.estado==='vendido'?form.fecha_venta||null:null
        payload.servicios=Array.isArray(form.servicios)?form.servicios:[]
      }
      await api(path,{method:editingId?'PATCH':'POST',body:payload})
      await load();actualizarDatos()
      setNotice(editingId?'Registro actualizado.':'Registro creado correctamente.')
      setForm(null);setEditingId(null)
    }catch(err){setError(err.message)}finally{setBusy(false)}
  }
  const remove=async f=>{
    if(!window.confirm(`¿Eliminar ${config.label} «${f.properties.nombre||f.properties.codigo}»? Esta operación quedará en bitácora.`))return
    try{await api(`/${type}/${f.properties.id}`,{method:'DELETE'});await load();actualizarDatos();setNotice('Registro eliminado.');setError('')}
    catch(e){setError(e.message)}
  }
  const importGeo=async e=>{
    const file=e.target.files?.[0];if(!file)return
    try{
      const payload=JSON.parse(await file.text())
      const geometry=payload.type==='FeatureCollection'?payload.features?.[0]?.geometry:payload.type==='Feature'?payload.geometry:payload
      if(!geometry||!['Polygon','Point'].includes(geometry.type))throw Error('Selecciona un GeoJSON con geometría Polygon o Point.')
      setForm(f=>({...f,geometry}))
      setNotice('Geometría importada. Comprueba los atributos antes de guardar.')
      setError('')
    }catch(err){setError('No se pudo importar el GeoJSON: '+err.message)}
    e.target.value=''
  }
  return <div className="gm-stack">
    {!form ? <>
      <div className="gm-row-wrap">
        <p className="gm-muted">{list.length} {config.plural} registrados.</p>
        {canEdit&&<button className="gm-primary" type="button" onClick={startNew}><Icon name="add" size={16}/>{config.newButton}</button>}
      </div>
      <label className="gm-label">Buscar
        <input value={filter} onChange={e=>setFilter(e.target.value)} placeholder="Nombre, código o manzano…"/>
      </label>
      {type==='lotes'&&<label className="gm-label">Estado
        <select value={stateFilter} onChange={e=>setStateFilter(e.target.value)}>
          <option value="todos">Todos</option>
          {Object.entries(statusLabel).map(([k,v])=><option key={k} value={k}>{v}</option>)}
        </select>
      </label>}
      <div className="gm-list">
        {filtered.map(f=>{
          const p=f.properties
          const protectedRecord=p.solo_lectura===true || /areas?[ _-]+verdes?|zonas?[ _-]+verdes?|equipamiento/i.test(`${p.tipo||''} ${p.categoria||''} ${p.clase||''} ${p.uso_suelo||''} ${p.nombre||''}`.normalize('NFD').replace(/[\u0300-\u036f]/g,''))
          return <article className="gm-list-card" key={p.id}>
            <div className="gm-list-details"><strong>{p.nombre||p.codigo}</strong>
              <small>{type==='lotes'?`${p.urbanizacion} · ${p.superficie_m2??'—'} m²`:type==='puntos'?p.tipo:'Sucre'}</small>
              {type==='lotes'&&<span className={'gm-pill '+p.estado}>{statusLabel[p.estado]||p.estado}{p.precio_usd?` · US$ ${formatExactoBoliviano(p.precio_usd)}`:p.precio!==null&&p.precio!==undefined?` · ${money(p.precio)}`:''}</span>}
              {type==='lotes'&&p.estado==='reservado'&&p.reservaVenceEn&&<Countdown expiresAt={p.reservaVenceEn}/>}
            </div>
            <div className="gm-row-actions">
              <button onClick={()=>focus(f)} title="Ver en mapa" aria-label="Ver en mapa"><Icon name="location" size={16}/></button>
              {canEdit&&!protectedRecord&&<button onClick={()=>edit(f)} title="Editar" aria-label="Editar"><Icon name="edit" size={16}/></button>}
              {admin&&!protectedRecord&&<button className="danger" onClick={()=>remove(f)} title="Eliminar" aria-label="Eliminar"><Icon name="delete" size={16}/></button>}
            </div>
          </article>
        })}
        {!filtered.length&&<p className="gm-muted">No hay registros con estos filtros.</p>}
      </div>
    </> : <>
      <button className="gm-text-btn" type="button" onClick={()=>{setForm(null);setError('');setNotice('')}}><Icon name="left" size={16}/> Volver al listado</button>
      <h3>{editingId?`Editar ${config.label}`:config.newButton}</h3>
      <form onSubmit={submit} className="gm-form">
        {type==='urbanizaciones'&&<>
          <label>Nombre de urbanización<input required value={form.nombre} onChange={e=>setForm({...form,nombre:e.target.value})}/></label>
          <label>Descripción<textarea rows={3} value={form.descripcion||''} onChange={e=>setForm({...form,descripcion:e.target.value})}/></label>
        </>}
        {type==='lotes'&&<>
          <label>Código de lote<input required value={form.codigo} onChange={e=>setForm({...form,codigo:e.target.value})}/></label>
          <label>Urbanización<select required value={form.urbanizacion} onChange={e=>setForm({...form,urbanizacion:e.target.value})}>
            <option value="">Seleccionar…</option>
            {urbanizations.map(f=><option key={f.properties.id} value={f.properties.nombre}>{f.properties.nombre}</option>)}
          </select></label>
          <div className="gm-two-col"><label>Manzano<input value={form.manzano||''} onChange={e=>setForm({...form,manzano:e.target.value})}/></label>
            <label>Estado<select value={form.estado} onChange={e=>setForm({...form,estado:e.target.value})} disabled={editingId&&originalState==='vendido'&&!admin}>{Object.entries(statusLabel).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label></div>
          {editingId&&originalState==='vendido'&&!admin&&<p className="gm-note">Solo Administración puede revertir una venta. Puedes modificar los demás atributos del lote.</p>}
          {form.estado!==(editingId?originalState:'disponible')&&<p className="gm-status-notice">Cambio solicitado: {statusLabel[editingId?originalState:'disponible']} → {statusLabel[form.estado]}. Se registrará en la bitácora.</p>}
          {form.estado==='reservado' && form.estado===originalState && editingId && form.reservaVenceEn &&<div className="gm-status-notice">Vencimiento actual: {formatDate(form.reservaVenceEn)} <Countdown expiresAt={form.reservaVenceEn}/></div>}
          {form.estado!==(editingId?originalState:'disponible') && ['reservado','vendido'].includes(form.estado)&&<OperationFields tipo={form.estado} value={operation} onChange={setOperation}/>}
          <label>Superficie (m²)<input type="number" min="0" step="0.01" value={form.superficie_m2??''} onChange={e=>setForm({...form,superficie_m2:e.target.value})}/></label>
          <fieldset className="gm-quote-terms">
            <legend>Plan de pago del lote · importes en US$</legend>
            <p className="gm-note">Introduce manualmente el precio, inicial y plazo aplicables a ESTE lote. Las promociones se registran por su nombre; no se aplican porcentajes automáticamente. Usa punto decimal sin separador de miles, por ejemplo 13900 y 300.</p>
            <div className="gm-two-col">
              <label>Plan o promoción (opcional)<input value={form.promocion??''} maxLength={70} placeholder="Ej.: Completo, Promo 1, Semicontado" onChange={e=>setForm({...form,promocion:e.target.value})}/></label>
              <label>Precio total del lote (US$)<input type="text" inputMode="decimal" placeholder="13900" value={form.precio_usd??''} onChange={e=>setForm({...form,precio_usd:e.target.value})}/></label>
              <label>Cuota inicial (US$)<input type="text" inputMode="decimal" placeholder="300" value={form.cuota_inicial_usd??''} onChange={e=>setForm({...form,cuota_inicial_usd:e.target.value})}/></label>
              <label>Plazo (meses)<input type="number" min="1" max="600" step="1" placeholder="72" value={form.plazo_meses??''} onChange={e=>setForm({...form,plazo_meses:e.target.value})}/></label>
              <label>Tipo de cambio (Bs por US$)<select value={form.tipo_cambio||'7'} onChange={e=>setForm({...form,tipo_cambio:e.target.value})}><option value="7">7,00</option><option value="6.97">6,97</option></select></label>
              {form.estado==='reservado'&&<label>Vigencia de la cotización (días)<input type="number" min="1" max="365" step="1" value={form.vigencia_cotizacion_dias??''} onChange={e=>setForm({...form,vigencia_cotizacion_dias:e.target.value})}/></label>}
              {form.estado==='vendido'&&<label>Fecha de venta<input type="date" value={form.fecha_venta??''} max={new Date().toISOString().slice(0,10)} onChange={e=>setForm({...form,fecha_venta:e.target.value})}/></label>}
            </div>
            {financingPreview?.error&&<p className="gm-error" role="alert">{financingPreview.error}</p>}
            {financingPreview?.result&&<div className="gm-financing-result" role="status">
              <strong>Cuota mensual calculada: Bs {formatExactoBoliviano(financingPreview.result.cuota_mensual_bs_exacta)}</strong>
              <span>Valor exacto: {financingPreview.result.cuota_mensual_bs_fraccion} Bs · (precio − inicial) × tipo de cambio ÷ meses.</span>
              <small>Los paréntesis indican un período decimal repetitivo; no hay redondeo. La cifra se calcula, no se escribe manualmente.</small>
            </div>}
            <div className="gm-quote-services">
              <strong>Servicios confirmados para este lote</strong>
              {['Tendido eléctrico','Tanque de agua','Papeles al día'].map(service=><label key={service} className="gm-quote-check">
                <input type="checkbox" checked={Array.isArray(form.servicios)&&form.servicios.includes(service)} onChange={e=>setForm(prev=>({...prev,servicios:e.target.checked?[...new Set([...(prev.servicios||[]),service])]:(prev.servicios||[]).filter(x=>x!==service)}))}/>
                {service}
              </label>)}
            </div>
          </fieldset>
          <label>Observaciones<textarea rows={2} value={form.observaciones||''} onChange={e=>setForm({...form,observaciones:e.target.value})}/></label>
        </>}
        {type==='puntos'&&<>
          <label>Nombre<input required value={form.nombre} onChange={e=>setForm({...form,nombre:e.target.value})}/></label>
          <label>Categoría<select value={form.tipo} onChange={e=>setForm({...form,tipo:e.target.value})}>
            <option value="colegio">Colegio</option><option value="salud">Centro de salud</option>
            <option value="transporte">Transporte</option><option value="comercio">Comercio</option><option value="otro">Otro</option>
          </select></label>
          <label>Descripción<textarea rows={2} value={form.descripcion||''} onChange={e=>setForm({...form,descripcion:e.target.value})}/></label>
        </>}
        <div className="gm-geometry-section">
          <strong>Ubicación geográfica</strong>
          <p className="gm-muted">{form.geometry?`${form.geometry.type} cargado · ${form.geometry.type==='Point'?'1 ubicación':`${form.geometry.coordinates?.[0]?.length-1||0} vértices`}`:'Todavía no se ha definido geometría.'}</p>
          <div className="gm-inline-actions">
            <button type="button" className="gm-secondary" onClick={()=>beginDrawing(type==='puntos'?'point':'polygon')}><Icon name="location" size={15}/> Dibujar en mapa</button>
            <label className="gm-file-label"><Icon name="upload" size={15}/> Importar GeoJSON<input type="file" accept=".geojson,.json,application/geo+json" onChange={importGeo}/></label>
          </div>
          <p className="gm-note">El mapa permanece activo durante el dibujo. El archivo importado debe contener la geometría del registro.</p>
        </div>
        <button className="gm-primary" type="submit" disabled={busy}><Icon name="save" size={16}/>{busy?'Guardando…':'Guardar cambios'}</button>
      </form>
      {type==='lotes'&&lotOperations.length>0&&<section className="gm-mini-history gm-operation-history"><h3>Personas y operaciones registradas</h3>
        <p className="gm-note">Información interna, visible solo para administradores y editores.</p>
        {lotOperations.map(op=>{
          const nombre=`${op.persona.nombre} ${op.persona.apellido}`
          const link=whatsappUrl(op.persona.numero,`Hola, ${op.persona.nombre}. Te escribimos de MAX Inversiones sobre el lote ${op.codigo}.`)
          return <article className="gm-operation-card" key={op.id}><strong>{op.tipo==='reservado'?'Reserva':'Venta'} · {nombre}</strong>
            <small>CI: {op.persona.ci} · Celular: {op.persona.numero} · Referencia: {op.persona.numeroRef}</small>
            <small>Estado: {op.estado} · Registrada: {formatDate(op.creado)}</small>
            {op.tipo==='reservado'&&<small>Vencimiento: {formatDate(op.reservaVenceEn)}</small>}
            {op.tipo==='vendido'&&<small>Modalidad: {op.modalidad}{op.detalleModalidad?` — ${op.detalleModalidad}`:''}</small>}
            {link&&<a href={link} target="_blank" rel="noopener noreferrer">Preparar mensaje por WhatsApp</a>}
          </article>
        })}
      </section>}
      {type==='lotes'&&history.length>0&&<section className="gm-mini-history"><h3>Movimientos relacionados</h3>{history.slice(0,8).map(a=><p key={a.id}>{a.accion} · @{a.usuario} · {new Date(a.fecha).toLocaleDateString('es-BO')}</p>)}</section>}
    </>}
    {error&&<p className="gm-error" role="alert">{error}</p>}
    {notice&&<p className="gm-success" role="status">{notice}</p>}
  </div>
}
