/** Utilidades de presentación de reservas. No envían mensajes automáticamente. */
export function futureLocal(minutes=1440){
  const d=new Date(Date.now()+minutes*60000)
  const two=n=>String(n).padStart(2,'0')
  return `${d.getFullYear()}-${two(d.getMonth()+1)}-${two(d.getDate())}T${two(d.getHours())}:${two(d.getMinutes())}`
}
export function formatDate(value){
  if(!value)return 'Sin fecha registrada'
  const d=new Date(value)
  return Number.isNaN(d.getTime())?'Fecha inválida':d.toLocaleString('es-BO',{dateStyle:'short',timeStyle:'short'})
}
export function remainingTime(value,now=Date.now()){
  const end=Date.parse(value||'')
  if(!Number.isFinite(end))return 'Sin vencimiento definido'
  let seconds=Math.ceil((end-now)/1000)
  if(seconds<=0)return 'Plazo vencido'
  const days=Math.floor(seconds/86400);seconds%=86400
  const hours=Math.floor(seconds/3600);seconds%=3600
  const minutes=Math.floor(seconds/60);seconds%=60
  const parts=[]
  if(days)parts.push(`${days} d`)
  if(hours||days)parts.push(`${hours} h`)
  parts.push(`${minutes} min`)
  if(!days&&!hours)parts.push(`${seconds} s`)
  return parts.join(' ')
}
/** Bolivia: número local de ocho dígitos, internacional con prefijo explícito. */
export function whatsappUrl(phone, message){
  let digits=String(phone||'').replace(/\D/g,'')
  if(digits.length===8) digits='591'+digits
  if(digits.length<10||digits.length>15)return null
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`
}
export function expiredMessage(notification){
  const name=notification.contacto?.nombre||'Hola'
  return `Hola, ${name}. Te escribimos de MAX Inversiones para informarte que el plazo de reserva del lote ${notification.codigo} de ${notification.urbanizacion} ha finalizado. El lote volvió a estar disponible. Si todavía tienes interés, contáctanos para verificar su disponibilidad actual.`
}
