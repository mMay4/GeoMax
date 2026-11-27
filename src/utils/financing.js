/** Cálculo comercial exacto. Solo se aceptan decimales finitos de entrada.
 * La división puede producir decimales periódicos: se expresan como 1.322,(2)
 * y se guarda la fracción irreducible para evitar redondeos.
 */
function gcd(a,b){
  a=a<0n?-a:a;b=b<0n?-b:b
  while(b){[a,b]=[b,a%b]}
  return a
}
function rational(n,d=1n){
  if(d===0n)throw Error('El divisor no puede ser cero.')
  if(d<0n){n=-n;d=-d}
  const factor=gcd(n,d)
  return {n:n/factor,d:d/factor}
}
function readDecimal(value,label,{allowZero=false}={}){
  const s=String(value??'').trim().replace(',','.')
  if(!/^\d+(?:\.\d{1,12})?$/.test(s))throw Error(`${label} debe ser un número decimal sin separadores de miles (máximo 12 decimales).`)
  const [whole,part='']=s.split('.')
  if(whole.length>13)throw Error(`${label} supera el límite permitido.`)
  const dec=rational(BigInt(whole+part),10n**BigInt(part.length))
  if(dec.n===0n&&!allowZero)throw Error(`${label} debe ser mayor que cero.`)
  return {str:(BigInt(whole)).toString()+(part?'.'+part:''),...dec}
}
function decimalCycle({n,d}){
  const sign=n<0n?'-':''
  let m=n<0n?-n:n
  const integer=m/d
  m%=d
  if(!m)return sign+integer.toString()
  let digits='',index=0
  const seen=new Map()
  while(m!==0n&&!seen.has(m)){
    seen.set(m,index++)
    m*=10n
    digits+=(m/d).toString()
    m%=d
  }
  if(!m)return sign+integer.toString()+'.'+digits
  const pos=seen.get(m)
  return sign+integer.toString()+'.'+digits.slice(0,pos)+'('+digits.slice(pos)+')'
}
export function formatExactoBoliviano(value){
  if(value===null||value===undefined||value==='')return 'Sin calcular'
  const [integer,decimal] = String(value).split('.')
  const grouped=integer.replace(/\B(?=(\d{3})+(?!\d))/g,'.')
  return decimal===undefined?grouped:grouped+','+decimal
}
export function calcularFinanciamiento({precio_usd,cuota_inicial_usd,plazo_meses,tipo_cambio}){
  const price=readDecimal(precio_usd,'El precio en US$')
  const initial=readDecimal(cuota_inicial_usd,'La cuota inicial en US$',{allowZero:true})
  if(initial.n*price.d>=price.n*initial.d)throw Error('La cuota inicial debe ser inferior al precio total.')
  const termString=String(plazo_meses??'').trim()
  if(!/^\d+$/.test(termString))throw Error('El plazo debe ser un número entero de meses.')
  const months=Number(termString)
  if(!Number.isSafeInteger(months)||months<1||months>600)throw Error('El plazo debe estar entre 1 y 600 meses.')
  const rate=String(tipo_cambio??'').trim().replace(',','.')
  if(!['6.97','7'].includes(rate))throw Error('Selecciona un tipo de cambio de 6,97 o 7 Bs/US$.')
  const exchange=readDecimal(rate,'Tipo de cambio')
  const balance=rational(price.n*initial.d-initial.n*price.d,price.d*initial.d)
  const monthly=rational(balance.n*exchange.n,balance.d*exchange.d*BigInt(months))
  return {
    precio_usd:price.str,cuota_inicial_usd:initial.str,
    plazo_meses:months,tipo_cambio:rate,
    saldo_usd_exacto:decimalCycle(balance),
    cuota_mensual_bs_exacta:decimalCycle(monthly),
    cuota_mensual_bs_fraccion:`${monthly.n}/${monthly.d}`
  }
}
/** Suma exacta de precios en US$; solo incluye valores informados. */
export function sumarDecimalesExactos(values){
  let acc=rational(0n)
  for(const value of values){
    const x=readDecimal(value,'El importe',{allowZero:true})
    acc=rational(acc.n*x.d+x.n*acc.d,acc.d*x.d)
  }
  return decimalCycle(acc)
}

/** Descuento opcional de contado, calculado con racionales para no redondear el importe. */
export function calcularPrecioContado(precio_usd,descuento_contado_pct){
  if(descuento_contado_pct===null||descuento_contado_pct===undefined||String(descuento_contado_pct).trim()==='')return null
  const price=readDecimal(precio_usd,'El precio en US$')
  const discount=readDecimal(descuento_contado_pct,'El descuento al contado',{allowZero:true})
  if(discount.n>100n*discount.d)throw Error('El descuento debe estar entre 0 y 100 %.')
  const remaining=rational(100n*discount.d-discount.n,100n*discount.d)
  const cash=rational(price.n*remaining.n,price.d*remaining.d)
  return {descuento_contado_pct:discount.str,precio_contado_usd:decimalCycle(cash)}
}
