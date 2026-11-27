import {futureLocal} from '../../utils/reservas'

export const emptyOperation=()=>({
  nombre:'',apellido:'',ci:'',numero:'',numeroRef:'',
  reservaVenceEn:futureLocal(),modalidad:'contado',detalleModalidad:''
})

/** Campos visibles solo cuando el cambio de estado crea una reserva o una venta. */
export default function OperationFields({tipo,value,onChange}){
  if(tipo!=='reservado' && tipo!=='vendido')return null
  const update=(key,v)=>onChange({...value,[key]:v})
  return <section className="gm-lot-operation" aria-label={tipo==='reservado'?'Datos de reserva':'Datos de compra'}>
    <h4>{tipo==='reservado'?'Datos de la persona que reserva':'Datos de la persona compradora'}</h4>
    <div className="gm-two-col">
      <label>Nombre *<input required maxLength="70" autoComplete="off" value={value.nombre} onChange={e=>update('nombre',e.target.value)} /></label>
      <label>Apellido *<input required maxLength="80" autoComplete="off" value={value.apellido} onChange={e=>update('apellido',e.target.value)} /></label>
    </div>
    <label>CI *<input required maxLength="30" autoComplete="off" placeholder="Documento de identidad" value={value.ci} onChange={e=>update('ci',e.target.value)} /></label>
    <div className="gm-two-col">
      <label>Número de celular *<input required type="tel" inputMode="tel" maxLength="22" placeholder="Ej. 7XXXXXXX" value={value.numero} onChange={e=>update('numero',e.target.value)} /></label>
      <label>Número de referencia *<input required type="tel" inputMode="tel" maxLength="22" placeholder="Otro contacto" value={value.numeroRef} onChange={e=>update('numeroRef',e.target.value)} /></label>
    </div>
    {tipo==='reservado'&&<>
      <label>Fecha y hora límite de reserva *<input required type="datetime-local" min={futureLocal(1)} value={value.reservaVenceEn} onChange={e=>update('reservaVenceEn',e.target.value)} /></label>
      <div className="gm-quick-times" aria-label="Duraciones rápidas de reserva">
        <button type="button" onClick={()=>update('reservaVenceEn',futureLocal(60))}>1 hora</button>
        <button type="button" onClick={()=>update('reservaVenceEn',futureLocal(24*60))}>24 horas</button>
        <button type="button" onClick={()=>update('reservaVenceEn',futureLocal(3*24*60))}>3 días</button>
        <button type="button" onClick={()=>update('reservaVenceEn',futureLocal(7*24*60))}>7 días</button>
      </div>
      <p className="gm-note">Al vencer, el servidor devuelve el lote a Disponible y crea una notificación para contactar al interesado. No envía WhatsApp automáticamente.</p>
    </>}
    {tipo==='vendido'&&<>
      <label>Modalidad de compra *<select required value={value.modalidad} onChange={e=>update('modalidad',e.target.value)}>
        <option value="contado">Al contado</option>
        <option value="credito">Crédito / financiamiento</option>
        <option value="cuotas">Pago en cuotas</option>
        <option value="otro">Otra modalidad</option>
      </select></label>
      {value.modalidad==='otro'&&<label>Especificar modalidad *<input required maxLength="100" value={value.detalleModalidad} onChange={e=>update('detalleModalidad',e.target.value)}/></label>}
    </>}
    <p className="gm-note">Datos personales internos: visibles únicamente para Administración y Edición. Utiliza datos autorizados por la persona.</p>
  </section>
}

export function operationPayload(value,tipo){
  const base={persona:{nombre:value.nombre,apellido:value.apellido,ci:value.ci,numero:value.numero,numeroRef:value.numeroRef}}
  if(tipo==='reservado')base.reservaVenceEn=new Date(value.reservaVenceEn).toISOString()
  if(tipo==='vendido'){
    base.modalidad=value.modalidad
    if(value.modalidad==='otro')base.detalleModalidad=value.detalleModalidad
  }
  return base
}
