import {useEffect,useMemo,useState} from 'react'
import {api,logAction} from '../../services/api'
import Icon from '../Common/Icon'
import PrintLetterhead from './PrintLetterhead'
import {useMapContext} from '../../context/MapContext'
import {downloadCsv,statusLabel} from '../../utils/export'

const naturalSorter=new Intl.Collator('es',{numeric:true,sensitivity:'base'})
const clean=(value)=>value===null||value===undefined||value===''?'—':String(value)
const shortDate=(value)=>new Date(value).toLocaleDateString('es-BO',{timeZone:'America/La_Paz'})

/** Formato general de lotes por urbanización, de la página 2 de Cotizacion.docx. */
export default function ReportsPanel(){
  const {lotesRevision}=useMapContext()
  const [summary,setSummary]=useState(null)
  const [lots,setLots]=useState([])
  const [filter,setFilter]=useState('todas')
  const [status,setStatus]=useState('todos')
  const [error,setError]=useState('')
  const load=()=>Promise.all([api('/summary'),api('/lots')])
    .then(([s,l])=>{setSummary(s);setLots(l.features||[]);setError('')})
    .catch(e=>setError(e.message))
  useEffect(()=>{load()},[lotesRevision])

  const filtered=useMemo(()=>lots.filter(f=>
    (filter==='todas'||f.properties.urbanizacion===filter)&&
    (status==='todos'||f.properties.estado===status)
  ).sort((a,b)=>naturalSorter.compare(clean(a.properties.manzano),clean(b.properties.manzano))||naturalSorter.compare(clean(a.properties.codigo),clean(b.properties.codigo))),[lots,filter,status])

  const count={pendiente:0,disponible:0,reservado:0,vendido:0}
  for(const lot of filtered){
    if(lot.properties.estado in count)count[lot.properties.estado]++
  }
  const urbanization=filter==='todas'?'Todas las urbanizaciones':filter

  const exportCsv=()=>{
    downloadCsv('GeoMax_Reporte_General_Lotes.csv',
      ['N.º','Lote','Manzano','Superficie (m²)','Estado'],
      filtered.map((f,index)=>[index+1,f.properties.codigo,f.properties.manzano,
        f.properties.superficie_m2,statusLabel[f.properties.estado]||f.properties.estado]))
    logAction('exportar_reporte',`Reporte general de ${filtered.length} lotes · ${filter}, ${status}`)
  }
  const print=()=>{
    logAction('exportar_reporte',`Reporte general de lotes PDF · ${filter}, ${status}`)
    window.print()
  }

  return <div className="gm-stack">
    <div className="gm-row-wrap"><button type="button" className="gm-secondary" onClick={load}><Icon name="refresh" size={15}/> Actualizar</button></div>
    <div className="gm-two-col">
      <label className="gm-label">Urbanización<select value={filter} onChange={e=>setFilter(e.target.value)}><option value="todas">Todas</option>{(summary?.porUrbanizacion||[]).map(u=><option key={u.nombre} value={u.nombre}>{u.nombre}</option>)}</select></label>
      <label className="gm-label">Estado<select value={status} onChange={e=>setStatus(e.target.value)}><option value="todos">Todos</option>{Object.entries(statusLabel).map(([key,value])=><option key={key} value={key}>{value}</option>)}</select></label>
    </div>
    <div className="gm-stats gm-stats-three">{[['Total',filtered.length],['Disponibles',count.disponible],['Reservados',count.reservado],['Vendidos',count.vendido],['Por confirmar',count.pendiente]].map(([title,qty])=><div key={title}><small>{title}</small><strong>{qty}</strong></div>)}</div>
    <div className="gm-inline-actions"><button type="button" onClick={exportCsv} className="gm-primary"><Icon name="download" size={17}/> Exportar CSV</button><button type="button" onClick={print} className="gm-secondary"><Icon name="print" size={17}/> Imprimir / PDF</button></div>
    <div className="gm-list">{filtered.slice(0,100).map(f=><article className="gm-list-card" key={f.properties.id}><div className="gm-list-details"><strong>{clean(f.properties.codigo)}</strong><small>Manzano {clean(f.properties.manzano)} · {clean(f.properties.superficie_m2)} m²</small></div><span className={'gm-pill '+f.properties.estado}>{statusLabel[f.properties.estado]||f.properties.estado}</span></article>)}</div>
    {filtered.length>100&&<p className="gm-muted">El listado en pantalla muestra 100 lotes. El PDF y el CSV incluyen todos los resultados.</p>}
    {error&&<p className="gm-error" role="alert">{error}</p>}

    <PrintLetterhead reportWatermark title="GEOMAX — REPORTE GENERAL DE LOTES" headerContent={<div className="gm-template-report__heading"><p>MAX INVERSIONES</p><h1>GEOMAX — REPORTE GENERAL DE LOTES</h1></div>}>
      <div className="gm-template-report__content">
      <div className="gm-template-report__details">
        <p><strong>Urbanización:</strong> {urbanization}</p>
        <p><strong>Ubicación:</strong> Sucre, Chuquisaca, Bolivia</p>
        <p><strong>Fecha de emisión:</strong> {shortDate(new Date())}</p>
        <p><strong>Tipo de reporte:</strong> General de lotes</p>
        {status!=='todos'&&<p><strong>Estado filtrado:</strong> {statusLabel[status]||status}</p>}
      </div>
      <h2 className="gm-template-report__section">1. Detalle general de lotes</h2>
      <table className="gm-template-report__table gm-template-report__lots">
        <thead><tr><th>N.º</th><th>Lote</th><th>Manzano</th><th>Superficie (m²)</th><th>Estado</th></tr></thead>
        <tbody>{filtered.map((f,index)=><tr key={f.properties.id}>
          <td>{index+1}</td><td>{clean(f.properties.codigo)}</td><td>{clean(f.properties.manzano)}</td><td>{clean(f.properties.superficie_m2)}</td><td>{statusLabel[f.properties.estado]||clean(f.properties.estado)}</td>
        </tr>)}
        {!filtered.length&&<tr><td colSpan={5}>No se encontraron lotes para los filtros seleccionados.</td></tr>}
        </tbody>
      </table>
      <h2 className="gm-template-report__section">2. Resumen de disponibilidad</h2>
      <table className="gm-template-report__table gm-template-report__summary">
        <thead><tr><th>Descripción</th><th>Cantidad</th></tr></thead>
        <tbody>
          <tr><td>Total de lotes</td><td>{filtered.length}</td></tr>
          <tr><td>Disponibles</td><td>{count.disponible}</td></tr>
          <tr><td>Reservados</td><td>{count.reservado}</td></tr>
          <tr><td>Vendidos</td><td>{count.vendido}</td></tr>
          {count.pendiente>0&&<tr><td>Por confirmar</td><td>{count.pendiente}</td></tr>}
        </tbody>
      </table>
      </div>
    </PrintLetterhead>
  </div>
}
