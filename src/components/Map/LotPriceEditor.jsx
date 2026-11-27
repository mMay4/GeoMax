import {useEffect,useMemo,useState} from 'react'
import {api} from '../../services/api'
import {calcularFinanciamiento,formatExactoBoliviano} from '../../utils/financing'

const fields={
  promocion:'',precio_usd:'',cuota_inicial_usd:'',plazo_meses:'',tipo_cambio:'7',
  vigencia_cotizacion_dias:'',fecha_venta:'',servicios:[]
}
const serviceList=['Tendido eléctrico','Tanque de agua','Papeles al día']
const normalize=properties=>({
  ...fields,
  promocion:String(properties.promocion??''),
  precio_usd:String(properties.precio_usd??''),
  cuota_inicial_usd:String(properties.cuota_inicial_usd??''),
  plazo_meses:properties.plazo_meses==null?'':String(properties.plazo_meses),
  tipo_cambio:String(properties.tipo_cambio||'7'),
  vigencia_cotizacion_dias:properties.vigencia_cotizacion_dias==null?'':String(properties.vigencia_cotizacion_dias),
  fecha_venta:properties.fecha_venta==null?'':String(properties.fecha_venta),
  servicios:Array.isArray(properties.servicios)?properties.servicios.filter(s=>serviceList.includes(s)):[]
})

export default function LotPriceEditor({lotId,initialProperties,onClose,onSaved}){
  const [feature,setFeature]=useState(null)
  const [form,setForm]=useState(()=>normalize(initialProperties||{}))
  const [loading,setLoading]=useState(true)
  const [saving,setSaving]=useState(false)
  const [error,setError]=useState('')

  useEffect(()=>{
    let alive=true
    setLoading(true);setError('');setFeature(null)
    api('/lots').then(({features})=>{
      if(!alive)return
      const current=(features||[]).find(f=>String(f.properties.id)===String(lotId))
      if(!current)throw Error(`El lote ${initialProperties?.codigo||lotId} no se encontró en el servidor.`)
      setFeature(current)
      setForm(normalize(current.properties))
    }).catch(e=>{if(alive)setError(e.message)}).finally(()=>{if(alive)setLoading(false)})
    return()=>{alive=false}
  },[lotId,initialProperties?.codigo])

  useEffect(()=>{
    const handleKey=e=>{if(e.key==='Escape'&&!saving)onClose()}
    window.addEventListener('keydown',handleKey)
    return()=>window.removeEventListener('keydown',handleKey)
  },[onClose,saving])

  const financing=useMemo(()=>{
    if(['precio_usd','cuota_inicial_usd','plazo_meses','tipo_cambio'].some(key=>form[key]===''))return null
    try{return {value:calcularFinanciamiento(form)}}
    catch(e){return {error:e.message}}
  },[form.precio_usd,form.cuota_inicial_usd,form.plazo_meses,form.tipo_cambio])

  const status=feature?.properties?.estado||initialProperties?.estado||'disponible'
  const update=(key,value)=>setForm(previous=>({...previous,[key]:value}))
  const save=async event=>{
    event.preventDefault()
    if(!feature||saving)return
    setError('')
    if(financing?.error){setError(financing.error);return}
    // Los datos históricos de un lote vendido pueden completarse por etapas.
    // Solo se calcula la mensualidad cuando están presentes los cuatro importes.
    setSaving(true)
    try{
      const b={
        properties:{...feature.properties,...form,
          // Los plazos de cotización son exclusivos de lotes reservados.
          vigencia_cotizacion_dias:status==='reservado'?form.vigencia_cotizacion_dias:null,
          // Se permite completar la fecha histórica de una venta ya registrada.
          fecha_venta:status==='vendido'?form.fecha_venta:null},
        geometry:feature.geometry
      }
      const result=await api(`/lots/${encodeURIComponent(lotId)}`,{method:'PATCH',body:b})
      onSaved(result.feature)
    }catch(e){setError(e.message)}finally{setSaving(false)}
  }

  return <div className="gm-price-editor-backdrop" role="presentation" onMouseDown={e=>{
    if(e.target===e.currentTarget&&!saving)onClose()
  }}>
    <section className="gm-price-editor" role="dialog" aria-modal="true" aria-label={`Editar plan de pago del lote ${initialProperties?.codigo||lotId}`}>
      <header className="gm-price-editor__header">
        <div><small>MAX INVERSIONES · GEOMAX</small><h2>Editar precios del lote {initialProperties?.codigo||lotId}</h2>
          <p>{initialProperties?.urbanizacion||'Urbanización'}</p></div>
        <button type="button" className="gm-price-editor__close" onClick={onClose} disabled={saving} aria-label="Cerrar formulario">×</button>
      </header>
      {loading?<p className="gm-price-editor__loading" role="status">Cargando datos del lote…</p>:<form className="gm-price-editor__form" onSubmit={save}>
        {!feature?<p className="gm-price-editor__error" role="alert">{error||'No se pudo cargar el lote.'}</p>:<>
          <p className="gm-price-editor__summary"><strong>{feature.properties.codigo}</strong> · Manzano {feature.properties.manzano||'—'} · {feature.properties.superficie_m2??'—'} m² · Estado: {feature.properties.estado||'—'}</p>
          <div className="gm-price-editor__grid">
            <label>Plan o promoción<input type="text" maxLength={70} value={form.promocion} onChange={e=>update('promocion',e.target.value)} placeholder="Ej. Completo, Promo 1"/></label>
            <label>Precio total (US$)<input type="text" inputMode="decimal" required={status==='disponible'||status==='reservado'} value={form.precio_usd} onChange={e=>update('precio_usd',e.target.value)} placeholder="13900"/></label>
            <label>Cuota inicial (US$)<input type="text" inputMode="decimal" required={status==='disponible'||status==='reservado'} value={form.cuota_inicial_usd} onChange={e=>update('cuota_inicial_usd',e.target.value)} placeholder="300"/></label>
            <label>Plazo (meses)<input type="number" min="1" max="600" step="1" required={status==='disponible'||status==='reservado'} value={form.plazo_meses} onChange={e=>update('plazo_meses',e.target.value)} placeholder="72"/></label>
            <label>Tipo de cambio (Bs por US$)<select required value={form.tipo_cambio} onChange={e=>update('tipo_cambio',e.target.value)}><option value="7">7,00</option><option value="6.97">6,97</option></select></label>
            {status==='reservado'&&<label>Vigencia de cotización (días)<input type="number" min="1" max="365" step="1" required value={form.vigencia_cotizacion_dias} onChange={e=>update('vigencia_cotizacion_dias',e.target.value)} placeholder="7"/></label>}
            {status==='vendido'&&<label>Fecha de venta<input type="date" value={form.fecha_venta} max={new Date().toISOString().slice(0,10)} onChange={e=>update('fecha_venta',e.target.value)}/></label>}
          </div>
          {financing?.value&&<div className="gm-price-editor__calculation" role="status"><span>Cuota mensual calculada (sin redondeo)</span><strong>Bs {formatExactoBoliviano(financing.value.cuota_mensual_bs_exacta)}</strong><small>Fracción exacta: {financing.value.cuota_mensual_bs_fraccion} Bs</small></div>}
          {financing?.error&&<p className="gm-price-editor__error" role="alert">{financing.error}</p>}
          <fieldset className="gm-price-editor__services"><legend>Servicios confirmados</legend>
            {serviceList.map(service=><label key={service}><input type="checkbox" checked={form.servicios.includes(service)} onChange={e=>update('servicios',e.target.checked?[...form.servicios,service]:form.servicios.filter(s=>s!==service))}/>{service}</label>)}
          </fieldset>
        </>}
        {error&&feature&&<p className="gm-price-editor__error" role="alert">{error}</p>}
        <div className="gm-price-editor__actions"><button type="button" onClick={onClose} disabled={saving}>Cancelar</button><button type="submit" disabled={!feature||saving||Boolean(financing?.error)}>{saving?'Guardando…':'Guardar precios y condiciones'}</button></div>
      </form>}
    </section>
  </div>
}
