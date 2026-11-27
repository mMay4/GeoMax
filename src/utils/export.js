export function downloadCsv(filename, headers, rows) {
  const cells = [headers,...rows].map(row => row.map(value => {
    const safe=String(value??'').replace(/^([\s]*)([=+@-])/, '$1\'$2').replaceAll('"','""')
    return `"${safe}"`
  }).join(';')).join('\r\n')
  const blob = new Blob(['\uFEFF' + cells], {type:'text/csv;charset=utf-8'})
  const url = URL.createObjectURL(blob)
  const a=document.createElement('a');a.href=url;a.download=filename;a.click()
  window.setTimeout(()=>URL.revokeObjectURL(url),1200)
}
export function downloadJson(filename, data) {
  const blob = new Blob([JSON.stringify(data,null,2)],{type:'application/json;charset=utf-8'})
  const url = URL.createObjectURL(blob)
  const a=document.createElement('a');a.href=url;a.download=filename;a.click()
  window.setTimeout(()=>URL.revokeObjectURL(url),1200)
}
export const dateBO=date=> date ? new Date(date).toLocaleString('es-BO', {timeZone:'America/La_Paz', dateStyle:'medium', timeStyle:'short'}) : '—'
export const money=n=>n===null||n===undefined||n===''?'Sin precio':`Bs ${Number(n).toLocaleString('es-BO',{minimumFractionDigits:2,maximumFractionDigits:2})}`
export const statusLabel={pendiente:'Por confirmar',disponible:'Disponible',reservado:'Reservado',vendido:'Vendido'}
