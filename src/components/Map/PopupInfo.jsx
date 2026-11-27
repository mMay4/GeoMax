import {useEffect,useState} from 'react'
import {api} from '../../services/api'
import OperationFields,{emptyOperation,operationPayload} from '../Reservations/OperationFields'
import Countdown from '../Reservations/Countdown'
import {formatDate} from '../../utils/reservas'
import {formatExactoBoliviano} from '../../utils/financing'
import {money} from '../../utils/export'

const hasValue=value=>value!==null&&value!==undefined&&String(value).trim()!==''
const dollars=value=>hasValue(value)?`US$ ${formatExactoBoliviano(value)}`:'Sin registrar'
const fullName=person=>person?[person.nombre,person.apellido].filter(Boolean).join(' ').trim():''
const statusLabels={pendiente:'POR CONFIRMAR',disponible:'DISPONIBLE',reservado:'RESERVADO',vendido:'VENDIDO'}

export default function PopupInfo({properties,onChangeStatus,onOpenManager,canEdit=false,canRevertSale=false}){
  const [status,setStatus]=useState(properties?.estado)
  const [nextStatus,setNextStatus]=useState(properties?.estado)
  const [expiresAt,setExpiresAt]=useState(properties?.reservaVenceEn)
  const [activeOperationId,setActiveOperationId]=useState(properties?.ultimaOperacionId||null)
  const [holder,setHolder]=useState(null)
  const [holderLoading,setHolderLoading]=useState(false)
  const [operation,setOperation]=useState(emptyOperation)
  const [busy,setBusy]=useState(false)
  const [error,setError]=useState('')
  const [success,setSuccess]=useState('')
  const lot=Boolean(properties?.estado)

  // La identidad de compradores y reservantes se consulta con autorización.
  // No se incluye CI, teléfono ni información personal en el GeoJSON del mapa.
  useEffect(()=>{
    if(!lot||!canEdit||!['reservado','vendido'].includes(status)||!activeOperationId){
      setHolder(null);setHolderLoading(false);return
    }
    let cancelled=false
    setHolder(null);setHolderLoading(true)
    api(`/lot-operations?lotId=${encodeURIComponent(properties.id)}`)
      .then(({operations})=>{
        if(cancelled)return
        const current=(operations||[]).find(op=>op.id===activeOperationId && op.tipo===status)
        setHolder(current?{
          nombre:fullName(current.persona),
          modalidad:current.modalidad||'',
          detalleModalidad:current.detalleModalidad||''
        }:null)
      })
      .catch(()=>{if(!cancelled)setHolder(null)})
      .finally(()=>{if(!cancelled)setHolderLoading(false)})
    return()=>{cancelled=true}
  },[lot,canEdit,status,activeOperationId,properties?.id])

  if(!properties)return null
  const changed=nextStatus!==status
  const pricePresent=hasValue(properties.precio_usd)
  const legacyPrice=hasValue(properties.precio)?money(properties.precio):'Sin registrar'
  const monthly=hasValue(properties.cuota_mensual_bs_exacta)?`Bs ${formatExactoBoliviano(properties.cuota_mensual_bs_exacta)}`:'Sin registrar'
  const services=Array.isArray(properties.servicios)?properties.servicios:
    typeof properties.servicios==='string'?properties.servicios.split(',').map(x=>x.trim()).filter(Boolean):[]

  const submit=async e=>{
    e.preventDefault()
    if(!changed)return
    if(status==='vendido' && nextStatus!=='vendido' && !window.confirm('¿Confirmar la reversión de la venta de este lote?'))return
    setBusy(true);setError('');setSuccess('')
    try{
      const extra=['reservado','vendido'].includes(nextStatus)?operationPayload(operation,nextStatus):undefined
      const answer=await onChangeStatus(properties.id,nextStatus,extra)
      setStatus(nextStatus)
      setActiveOperationId(answer?.feature?.properties?.ultimaOperacionId||null)
      setExpiresAt(answer?.feature?.properties?.reservaVenceEn||null)
      setSuccess('Estado actualizado y registrado en la bitácora.')
      setOperation(emptyOperation())
    }catch(err){setError(err.message)}finally{setBusy(false)}
  }

  return <div className="popup-card geomax-popup-card gm-lot-popup">
    <div className="gm-inspector-title">
      <h3>{properties.nombre||properties.codigo||'Información'}</h3>
      {status&&<span className={`status-badge status-${status}`}>{statusLabels[status]||status.toUpperCase()}</span>}
    </div>

    {lot?<>
      <div className="gm-inspector-grid">
      <section className="gm-inspector-section">
      <h4 className="gm-popup-section-title">Datos del lote</h4>
      <table className="popup-table" aria-label="Información del lote"><tbody>
        <tr><td>ID</td><td>{properties.id||'—'}</td></tr>
        <tr><td>Código</td><td>{properties.codigo||'—'}</td></tr>
        <tr><td>Manzano</td><td>{properties.manzano||'—'}</td></tr>
        <tr><td>Urbanización</td><td>{properties.urbanizacion||'—'}</td></tr>
        <tr><td>Superficie</td><td>{hasValue(properties.superficie_m2)?`${properties.superficie_m2} m²`:'Sin registrar'}</td></tr>
      </tbody></table>
      </section>
      <section className="gm-inspector-section">
      <h4 className="gm-popup-section-title">Precio y plan de pago</h4>
      <table className="popup-table" aria-label="Condiciones comerciales del lote"><tbody>
        <tr><td>Precio del lote</td><td><strong>{pricePresent?dollars(properties.precio_usd):legacyPrice}</strong></td></tr>
        {pricePresent&&<>
          <tr><td>Cuota inicial</td><td>{dollars(properties.cuota_inicial_usd)}</td></tr>
          <tr><td>Plazo</td><td>{hasValue(properties.plazo_meses)?`${properties.plazo_meses} meses`:'Sin registrar'}</td></tr>
          <tr><td>Tipo de cambio</td><td>{hasValue(properties.tipo_cambio)?`${formatExactoBoliviano(properties.tipo_cambio)} Bs/US$`:'Sin registrar'}</td></tr>
          <tr><td>Cuota mensual</td><td><strong>{monthly}</strong></td></tr>
          {hasValue(properties.promocion)&&<tr><td>Plan</td><td>{properties.promocion}</td></tr>}
        </>}
        {status==='reservado'&&hasValue(properties.vigencia_cotizacion_dias)&&<tr><td>Vigencia cotización</td><td>{properties.vigencia_cotizacion_dias} días</td></tr>}
        {status==='vendido'&&hasValue(properties.fecha_venta)&&<tr><td>Fecha de venta</td><td>{String(properties.fecha_venta).split('-').reverse().join('/')}</td></tr>}
        {services.length>0&&<tr><td>Servicios</td><td>{services.join(', ')}</td></tr>}
      </tbody></table>
      </section>
      </div>

      {['reservado','vendido'].includes(status)&&canEdit&&<div className="gm-popup-holder">
        <strong>{status==='reservado'?'Reservado a nombre de':'Vendido a nombre de'}</strong>
        <span>{holderLoading?'Consultando datos…':holder?.nombre||'Sin titular registrado'}</span>
        {status==='vendido'&&holder?.modalidad&&<small>Modalidad: {holder.modalidad}{holder.detalleModalidad?` · ${holder.detalleModalidad}`:''}</small>}
      </div>}
      {properties.precision_geometria&&<p className="gm-popup-geometry-note">Límites del lote pendientes de verificación topográfica.</p>}
      {status==='reservado'&&expiresAt&&<p className="gm-popup-countdown">Reserva hasta: {formatDate(expiresAt)} <Countdown expiresAt={expiresAt}/></p>}
    </>:<table className="popup-table"><tbody>
      {Object.entries(properties).filter(([key,value])=>!['precision_geometria','fuente'].includes(key)&&value!==null&&value!==undefined&&value!==''&&typeof value!=='object').map(([key,value])=><tr key={key}><td>{key.replaceAll('_',' ')}</td><td>{String(value)}</td></tr>)}
    </tbody></table>}

    {status&&canEdit&&<details className="gm-inspector-status-details">
      <summary>Cambiar estado del lote</summary>
      <form onSubmit={submit} className="gm-popup-status-form">
        <label className="popup-status-label">Nuevo estado
          <select value={nextStatus} onChange={e=>{setNextStatus(e.target.value);setError('');setSuccess('');setOperation(emptyOperation())}} disabled={busy || (status==='vendido'&&!canRevertSale)}>
            <option value="pendiente">Por confirmar</option>
            <option value="disponible">Disponible</option><option value="reservado">Reservado</option><option value="vendido">Vendido</option>
          </select>
        </label>
        {status==='vendido'&&!canRevertSale&&<p className="popup-hint">Solo Administración puede revertir una venta.</p>}
        {changed&&<>
          {nextStatus==='reservado'||nextStatus==='vendido'?<OperationFields tipo={nextStatus} value={operation} onChange={setOperation}/>:<p className="popup-hint">El lote se marcará como disponible. La reserva activa, si existe, quedará cancelada.</p>}
          <button className="gm-popup-more" type="submit" disabled={busy}>{busy?'Guardando…':'Confirmar cambio de estado'}</button>
        </>}
      </form>
    </details>}
    {status&&canEdit&&onOpenManager&&<button type="button" className="gm-popup-more gm-popup-edit-prices" onClick={()=>onOpenManager(properties.id)}>Editar precios y datos del lote</button>}
    {error&&<p className="popup-error" role="alert">{error}</p>}
    {success&&<p className="gm-success" role="status">{success}</p>}
  </div>
}
