import {useEffect,useMemo,useState} from 'react'
import {api,logAction} from '../../services/api'
import {dateBO,money} from '../../utils/export'
import {useAuth} from '../../context/AuthContext'
import Icon from '../Common/Icon'
import PrintLetterhead from './PrintLetterhead'
import {formatExactoBoliviano,calcularPrecioContado} from '../../utils/financing'

const shortDate=(value)=>new Date(value).toLocaleDateString('es-BO',{timeZone:'America/La_Paz'})
function usd(v){return v===null||v===undefined||v===''?'Sin precio':`US$ ${formatExactoBoliviano(v)}`}
function cuotaExacta(v){return v===null||v===undefined?'Sin calcular':`Bs ${formatExactoBoliviano(v)}`}
function bboxOf(features){
  let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity
  for(const feature of features){
    const ring=feature?.geometry?.type==='Polygon'?feature.geometry.coordinates?.[0]:null
    if(!ring)continue
    for(const [x,y] of ring){
      if(x<minX)minX=x
      if(y<minY)minY=y
      if(x>maxX)maxX=x
      if(y>maxY)maxY=y
    }
  }
  if(!Number.isFinite(minX))return null
  return {minX,minY,maxX,maxY}
}
function projectPoint(point,bbox,width,height,pad){
  const [x,y]=point
  const w=Math.max(1,bbox.maxX-bbox.minX)
  const h=Math.max(1,bbox.maxY-bbox.minY)
  const px=pad+((x-bbox.minX)/w)*(width-pad*2)
  const py=height-pad-((y-bbox.minY)/h)*(height-pad*2)
  return [px,py]
}
function pathFromRing(ring,bbox,width,height,pad){
  if(!ring?.length)return ''
  return ring.map((point,index)=>{
    const [x,y]=projectPoint(point,bbox,width,height,pad)
    return `${index===0?'M':'L'}${x.toFixed(2)} ${y.toFixed(2)}`
  }).join(' ')+' Z'
}
function centroidOf(feature){
  const ring=feature?.geometry?.type==='Polygon'?feature.geometry.coordinates?.[0]:null
  if(!ring?.length)return null
  let x=0,y=0,count=0
  for(const point of ring.slice(0,-1)){
    x+=point[0];y+=point[1];count++
  }
  return count?[x/count,y/count]:ring[0]
}
function googleMapsUrl(feature){
  const c=centroidOf(feature)
  return c?`https://www.google.com/maps?q=${c[1]},${c[0]}`:''
}
function stateLabel(state=''){
  const normalized=String(state).toLowerCase()
  if(normalized==='disponible')return 'DISPONIBLE'
  if(normalized==='reservado')return 'RESERVADO'
  if(normalized==='vendido')return 'VENDIDO'
  return normalized.toUpperCase()||'—'
}
function QuoteMapPreview({selectedLot}) {
  const [imageFailed, setImageFailed] = useState(false)
  const token = import.meta.env.VITE_MAPBOX_TOKEN?.trim()
  const ring = selectedLot?.geometry?.type === 'Polygon'
    ? selectedLot.geometry.coordinates?.[0] : null
  const imageUrl = useMemo(() => {
    if (!ring?.length || !token || token === 'pega_aqui_tu_token_publico_de_mapbox') return ''
    const center = centroidOf(selectedLot)
    if (!center) return ''
    const overlay = {
      type: 'Feature',
      properties: {
        stroke: '#FC8801', 'stroke-width': 5,
        fill: '#FAD006', 'fill-opacity': 0.26
      },
      geometry: {type: 'Polygon', coordinates: [ring]}
    }
    // Imagen satelital de Mapbox, centrada en el lote; independiente de la vista del geovisor.
    return `https://api.mapbox.com/styles/v1/mapbox/satellite-v9/static/geojson(${encodeURIComponent(JSON.stringify(overlay))})/${center[0]},${center[1]},20,0/800x340@2x?access_token=${encodeURIComponent(token)}`
  }, [selectedLot, token])

  useEffect(() => setImageFailed(false), [imageUrl])

  if (!ring?.length) {
    return <div className="gm-quote-sheet__map-empty">Ubicación del lote no disponible.</div>
  }

  const lotBox = bboxOf([selectedLot])
  const width = 800, height = 340, pad = 35
  const lotPath = pathFromRing(ring, lotBox, width, height, pad)
  return (
    <div className="gm-quote-sheet__map">
      {imageUrl && !imageFailed ? (
        <img
          className="gm-quote-sheet__satellite"
          src={imageUrl}
          onError={() => setImageFailed(true)}
          alt="Vista satelital del lote seleccionado"
        />
      ) : (
        <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Lote seleccionado">
          <rect width={width} height={height} fill="#eef3ea"/>
          <path d={lotPath} fill="#FAD006" fillOpacity="0.38" stroke="#FC8801" strokeWidth="5" />
        </svg>
      )}
    </div>
  )
}

export default function QuotesPanel(){
  const {user}=useAuth()
  const [lots,setLots]=useState([]),[quotes,setQuotes]=useState([])
  const [form,setForm]=useState({lotId:'',cliente:'',observaciones:'',vigencia_dias:'',descuento_contado_pct:''})
  const [selected,setSelected]=useState(null),[error,setError]=useState(''),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false)
  const canEdit=user.rol!=='lector'
  const load=()=>Promise.all([api('/lots'),api('/quotes')]).then(([l,q])=>{setLots(l.features);setQuotes(q.quotes)}).catch(e=>setError(e.message))
  useEffect(()=>{load()},[])
  const lot=useMemo(()=>lots.find(f=>f.properties.id===form.lotId),[lots,form.lotId])
  const selectedLot=useMemo(()=>lots.find(f=>f.properties.id===selected?.lotId)||null,[lots,selected?.lotId])
  const originalFeature=useMemo(()=>selected?.geometry?{
    geometry:selected.geometry,
    properties:{id:selected.lotId,urbanizacion:selected.urbanizacion}
  }:selectedLot,[selected,selectedLot])
  const mapsUrl=useMemo(()=>googleMapsUrl(originalFeature),[originalFeature])
  const requiredQuoteValues=useMemo(()=>{
    if(!lot)return []
    const p=lot.properties
    const fields=[
      ['manzano','manzano'],['superficie_m2','superficie'],
      ['precio_usd','precio en dólares'],['cuota_inicial_usd','cuota inicial en dólares'],
      ['plazo_meses','plazo en meses'],['tipo_cambio','tipo de cambio']
    ]
    return fields.filter(([k])=>p[k]===null||p[k]===undefined||p[k]==='').map(([,label])=>label)
  },[lot])
  const isExactQuote=Boolean(selected?.cuota_mensual_bs_fraccion)
  const cashPreview=useMemo(()=>{
    if(!lot?.properties?.precio_usd||form.descuento_contado_pct==='')return null
    try{return {value:calcularPrecioContado(lot.properties.precio_usd,form.descuento_contado_pct)}}
    catch(e){return {error:e.message}}
  },[lot,form.descuento_contado_pct])
  const cashValue=selected?.precio_contado_usd
  const dateQuote=selected?shortDate(selected.fecha):'—'
  const validity=selected?.vigencia_cotizacion_dias
  const validText=validity ? `${validity} día(s)${validity%7===0?` (${validity/7} semana(s))`:''}` : 'Sin registro' 

  const selectLot=e=>{
    const lotId=e.target.value
    const f=lots.find(x=>x.properties.id===lotId)
    setForm(prev=>({...prev,lotId,vigencia_dias:f?.properties?.estado==='reservado'&&f?.properties?.vigencia_cotizacion_dias?String(f.properties.vigencia_cotizacion_dias):''}))
  }
  const create=async e=>{
    e.preventDefault();setBusy(true);setError('');setNotice('')
    try{
      const d=await api('/quotes',{method:'POST',body:form})
      await load();setSelected(d.quote)
      setForm({lotId:'',cliente:'',observaciones:'',vigencia_dias:'',descuento_contado_pct:''})
      setNotice('Cotización registrada correctamente. Puedes imprimirla o guardarla como PDF.')
    }catch(err){setError(err.message)}finally{setBusy(false)}
  }
  const print=()=>{
    if(!selected)return
    logAction('consulta_cotizacion','Impresión de '+selected.id,selected.id)
    window.print()
  }
  return <div className="gm-stack">
    {canEdit&&<form onSubmit={create} className="gm-form gm-form-card">
      <h3>Nueva cotización</h3>
      <label>Lote<select required value={form.lotId} onChange={selectLot}><option value="">Selecciona un lote</option>{lots.map(f=><option value={f.properties.id} key={f.properties.id}>{f.properties.codigo} · {f.properties.urbanizacion}</option>)}</select></label>
      {lot&&<small className="gm-muted">Superficie: {lot.properties.superficie_m2??'—'} m² · Estado: {lot.properties.estado}</small>}
      <label>Nombre del destinatario<input required minLength={3} value={form.cliente} onChange={e=>setForm({...form,cliente:e.target.value})} placeholder="Nombre o razón social"/></label>
      {lot&&<div className="gm-quote-values-note">
        <strong>Plan del lote: {lot.properties.promocion||'Plan personalizado'}</strong>
        <span>Precio: {usd(lot.properties.precio_usd)} · Inicial: {usd(lot.properties.cuota_inicial_usd)} · Plazo: {lot.properties.plazo_meses??'—'} meses</span>
        <span>Tipo de cambio: {lot.properties.tipo_cambio?formatExactoBoliviano(lot.properties.tipo_cambio):'No registrado'} Bs/US$</span>
        <strong>Mensualidad exacta: {cuotaExacta(lot.properties.cuota_mensual_bs_exacta)}</strong>
        {lot.properties.cuota_mensual_bs_fraccion&&<small>Fracción exacta: {lot.properties.cuota_mensual_bs_fraccion} Bs · No se ha redondeado.</small>}
        <span>Servicios: {(lot.properties.servicios||[]).join(', ')||'Ninguno confirmado'}</span>
        {!!requiredQuoteValues.length&&<p className="gm-note"><strong>Faltan datos:</strong> {requiredQuoteValues.join(', ')}. Complétalos en Gestión de lotes antes de emitir la cotización.</p>}
      </div>}
      <label>Descuento al contado (%) — opcional<input type="text" inputMode="decimal" placeholder="Ej.: 5 o 10" value={form.descuento_contado_pct} onChange={e=>setForm({...form,descuento_contado_pct:e.target.value})}/></label>
      {cashPreview?.value&&<p className="gm-note">Precio al contado con descuento: {usd(cashPreview.value.precio_contado_usd)}. El descuento se guardará únicamente en esta cotización.</p>}
      {cashPreview?.error&&<p className="gm-error" role="alert">{cashPreview.error}</p>}
      <label>Vigencia de esta cotización (días)<input required type="number" min="1" max="365" step="1" value={form.vigencia_dias} onChange={e=>setForm({...form,vigencia_dias:e.target.value})} placeholder="Indica la vigencia de este documento"/></label>
      <label>Condiciones y observaciones<textarea rows={3} value={form.observaciones} onChange={e=>setForm({...form,observaciones:e.target.value})} placeholder="Observaciones, vigencia o forma de pago (opcional)"/></label>
      <button className="gm-primary" type="submit" disabled={busy||!lot||requiredQuoteValues.length>0||Boolean(cashPreview?.error)}><Icon name="save" size={16}/>{busy?'Guardando…':'Guardar cotización'}</button>
    </form>}
    <h3>Historial ({quotes.length})</h3>
    <div className="gm-list">{quotes.map(q=><button type="button" key={q.id} className={'gm-quote-item '+(selected?.id===q.id?'active':'')} onClick={()=>setSelected(q)}><span><strong>{q.id}</strong><small>{q.codigo} · {q.cliente} · {dateBO(q.fecha)}</small></span><b>{q.precio_usd!==undefined?usd(q.precio_usd):money(q.amount)}</b></button>)}{!quotes.length&&<p className="gm-muted">Todavía no hay cotizaciones registradas.</p>}</div>
    {selected&&<section className="gm-quote-preview"><div className="gm-row-wrap"><h3>Detalle de cotización</h3><button className="gm-secondary" type="button" onClick={print}><Icon name="print" size={15}/> Imprimir / PDF</button></div>
      <dl>
        <dt>Número</dt><dd>{selected.id}</dd>
        <dt>Fecha</dt><dd>{dateBO(selected.fecha)}</dd>
        <dt>Destinatario</dt><dd>{selected.cliente}</dd>
        <dt>Urbanización</dt><dd>{selected.urbanizacion}</dd>
        <dt>Lote</dt><dd>{selected.codigo}</dd>
        <dt>Manzano</dt><dd>{selected.manzano||'—'}</dd>
        <dt>Superficie</dt><dd>{selected.superficie_m2??'—'} m²</dd>
        <dt>Estado al emitir</dt><dd>{stateLabel(selected.estado)}</dd>
        {isExactQuote?<>
          <dt>Plan o promoción</dt><dd>{selected.promocion||'Plan personalizado'}</dd>
          <dt>Precio</dt><dd>{usd(selected.precio_usd)}</dd>
          <dt>Descuento al contado</dt><dd>{selected.descuento_contado_pct==null?'No registrado':`${formatExactoBoliviano(selected.descuento_contado_pct)} %`}</dd>
          <dt>Precio al contado (US$)</dt><dd>{selected.precio_contado_usd==null?'No registrado':usd(selected.precio_contado_usd)}</dd>
          <dt>Cuota inicial</dt><dd>{usd(selected.cuota_inicial_usd)}</dd>
          <dt>Plazo</dt><dd>{selected.plazo_meses} meses</dd>
          <dt>Tipo de cambio</dt><dd>{formatExactoBoliviano(selected.tipo_cambio)} Bs/US$</dd>
          <dt>Cuota mensual (sin redondear)</dt><dd>{cuotaExacta(selected.cuota_mensual_bs_exacta)}</dd>
          <dt>Fracción exacta</dt><dd>{selected.cuota_mensual_bs_fraccion} Bs</dd>
        </>:<>
          <dt>Precio al contado (versión anterior)</dt><dd>{money(selected.precio_contado??selected.amount)}</dd>
          <dt>Precio al crédito (versión anterior)</dt><dd>{money(selected.precio_credito)}</dd>
          <dt>Cuota inicial (versión anterior)</dt><dd>{money(selected.cuota_inicial)}</dd>
          <dt>Mensualidad (versión anterior)</dt><dd>{money(selected.cuota_mensual)}</dd>
          <dt>Plazo</dt><dd>{selected.plazo_credito||'—'}</dd>
        </>}
        <dt>Servicios confirmados</dt><dd>{Array.isArray(selected.servicios)&&selected.servicios.length?selected.servicios.join(', '):'Ninguno registrado'}</dd>
        <dt>Vigencia</dt><dd>{selected.validaHasta?`${selected.vigencia_cotizacion_dias} días · hasta ${dateBO(selected.validaHasta)}`:'Sin registro'}</dd>
      </dl>
      <p><strong>Observaciones:</strong> {selected.observaciones||'Sin observaciones.'}</p>
    </section>}
    {notice&&<p className="gm-success" role="status">{notice}</p>}
    {error&&<p className="gm-error" role="alert">{error}</p>}
    {selected&&<PrintLetterhead title="COTIZACIÓN DE LOTE" headerContent={false}>
      <QuoteMapPreview selectedLot={originalFeature}/>

      <h2 className="gm-template-quote__section">INFORMACIÓN DEL LOTE:</h2>
      <table className="gm-template-quote__table"><tbody>
        <tr><th>Lote N.º:</th><td>{selected.codigo||'—'}</td><th>Manzano:</th><td>{selected.manzano||'—'}</td></tr>
        <tr><th>Superficie:</th><td>{selected.superficie_m2??'—'} m²</td><th>Urbanización:</th><td>{selected.urbanizacion||'—'}</td></tr>
      </tbody></table>

      <h2 className="gm-template-quote__section">PRECIO AL CRÉDITO:</h2>
      <table className="gm-template-quote__table"><tbody>
        <tr><th>Precio:</th><td>{isExactQuote?usd(selected.precio_usd):'No registrado en US$'}</td><th>Cuota mensual:</th><td>{isExactQuote?cuotaExacta(selected.cuota_mensual_bs_exacta):money(selected.cuota_mensual)}</td></tr>
        <tr><th>Cuota inicial:</th><td>{isExactQuote?usd(selected.cuota_inicial_usd):'No registrado en US$'}</td><th>Plazo:</th><td>{isExactQuote?`${selected.plazo_meses} meses`:(selected.plazo_credito||'—')}</td></tr>
      </tbody></table>

      <h2 className="gm-template-quote__section">PRECIO AL CONTADO:</h2>
      <table className="gm-template-quote__table"><tbody>
        <tr><th>Descuento:</th><td>{selected.descuento_contado_pct===null||selected.descuento_contado_pct===undefined?'No registrado':`${formatExactoBoliviano(selected.descuento_contado_pct)} %`}</td><th>Precio:</th><td>{cashValue!==null&&cashValue!==undefined?usd(cashValue):'No registrado'}</td></tr>
      </tbody></table>

      <h2 className="gm-template-quote__section">BENEFICIOS</h2>
      <table className="gm-template-quote__table"><tbody>
        <tr><th>Tasa de cambio:</th><td>{selected.tipo_cambio?`${formatExactoBoliviano(selected.tipo_cambio)} Bs/US$`:'—'}</td><th>Promo:</th><td>{selected.promocion||'Sin promoción registrada'}</td></tr>
        <tr><th>Servicios:</th><td colSpan={3}>{Array.isArray(selected.servicios)&&selected.servicios.length?selected.servicios.join('  ·  '):'Sin servicios confirmados'}</td></tr>
      </tbody></table>
      <table className="gm-template-quote__table gm-template-quote__validity"><tbody>
        <tr><th>Fecha de cotización:</th><td>{dateQuote}</td><th>Plazo de cotización:</th><td>{validText}</td></tr>
      </tbody></table>
      <p className="gm-template-quote__client"><strong>Destinatario:</strong> {selected.cliente} <span>· N.º {selected.id}</span></p>
      {selected.observaciones&&<p className="gm-template-quote__observations"><strong>Observaciones:</strong> {selected.observaciones}</p>}
      <p className="gm-template-quote__location"><strong>VER UBICACIÓN:</strong> {mapsUrl?<a href={mapsUrl} target="_blank" rel="noopener noreferrer">Abrir ubicación del lote en Google Maps</a>:'Ubicación no disponible'}</p>
    </PrintLetterhead>}
  </div>
}
