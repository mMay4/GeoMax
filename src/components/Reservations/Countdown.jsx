import {useEffect,useState} from 'react'
import {remainingTime,formatDate} from '../../utils/reservas'
export default function Countdown({expiresAt}){
  const [clock,setClock]=useState(Date.now())
  useEffect(()=>{
    setClock(Date.now())
    const t=setInterval(()=>setClock(Date.now()),1000)
    return()=>clearInterval(t)
  },[expiresAt])
  if(!expiresAt)return null
  const ended=Date.parse(expiresAt)<=clock
  return <span className={'gm-countdown'+(ended?' expired':'')} title={`Vence: ${formatDate(expiresAt)}`}>
    {ended?'Reserva vencida':`Reserva: ${remainingTime(expiresAt,clock)}`}
  </span>
}
