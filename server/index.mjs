/**
 * GeoMax – API local (desarrollo y demostración).
 * Guarda usuarios con hashes scrypt, geometrías, cotizaciones y bitácora en JSON
 * mediante escrituras atómicas. Solo escucha en 127.0.0.1; NO es un backend
 * multiusuario de producción. Para uso institucional, migrar a PostgreSQL/PostGIS.
 */
import './config.mjs'
import { USE_POSTGRES } from './config.mjs'
import { connectPostgres } from './postgres-store.mjs'
import { calcularFinanciamiento, calcularPrecioContado } from '../src/utils/financing.js'
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const STORE = path.join(ROOT, 'server', 'data', 'geomax-local.json')
const PORT = Number(process.env.GEOMAX_API_PORT || 3001)
const now = () => new Date().toISOString()
const id = () => crypto.randomUUID()
const sessions = new Map()
const attempts = new Map()
const validRoles = new Set(['admin', 'editor', 'lector'])
const validStates = new Set(['pendiente', 'disponible', 'reservado', 'vendido'])
const knownQuoteServices = new Set(['Tendido eléctrico','Tanque de agua','Papeles al día'])
const purchaseModes = new Set(['contado', 'credito', 'cuotas', 'otro'])
const allowedActions = new Set([
  'medicion_distancia','medicion_superficie','consulta_lote','consulta_urbanizacion',
  'busqueda','cambio_vista','cambio_capa','exportar_lotes','consulta_poi',
  'exportar_reporte','consulta_reporte','consulta_cotizacion','geolocalizacion'
])
const cataloguePaths = {
  urbanizaciones: 'urbanizaciones.geojson',
  lotes: 'lotes.geojson',
  puntos: 'puntos-interes.geojson',
  areas: 'areas-protegidas.geojson'
}
function seedCollection(key) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, 'public', 'data', cataloguePaths[key]), 'utf8'))
}
function initialData() {
  return {
    users: [], audit: [], quotes: [], operations: [], notifications: [], migrations: [],
    collections: {
      urbanizaciones: seedCollection('urbanizaciones'),
      lotes: seedCollection('lotes'),
      puntos: seedCollection('puntos'),
      areas: seedCollection('areas')
    }
  }
}
function readData() {
  if (!fs.existsSync(STORE)) return initialData()
  const raw = JSON.parse(fs.readFileSync(STORE, 'utf8'))
  const collections = raw.collections || initialData().collections
  // Compatibilidad con la versión anterior, que almacenaba estados aislados.
  if (raw.lotOverrides && !raw.collections) {
    for (const feature of collections.lotes.features) {
      Object.assign(feature.properties, raw.lotOverrides[String(feature.properties.id)] || {})
    }
  }
  return {
    users: raw.users || [], audit: raw.audit || [], quotes: raw.quotes || [],
    operations: raw.operations || [], notifications: raw.notifications || [],
    migrations: raw.migrations || [],
    collections: {
      urbanizaciones: collections.urbanizaciones || seedCollection('urbanizaciones'),
      lotes: collections.lotes || seedCollection('lotes'),
      puntos: collections.puntos || seedCollection('puntos'),
      areas: collections.areas || seedCollection('areas')
    }
  }
}
let db = readData()
let pgStore = null
// Sustitución solicitada de la urbanización ficticia por Karapanza de Corazón III.
// Si el usuario tiene una base local de versiones previas, se preservan sus cuentas,
// bitácora, cotizaciones y otras urbanizaciones. Antes de modificarla se respalda.
async function migrateDemoToKarapanza() {
  const urbs=db.collections.urbanizaciones.features
  const lotes=db.collections.lotes.features
  const pois=db.collections.puntos.features
  const demoU=urbs.filter(f=>f.properties?.nombre==='Urbanización Demo MAX'||f.properties?.id==='URB-001')
  const demoL=lotes.filter(f=>f.properties?.urbanizacion==='Urbanización Demo MAX'||['L-001','L-002','L-003','L-004'].includes(f.properties?.id))
  const demoP=pois.filter(f=>['POI-001','POI-002','POI-003'].includes(f.properties?.id))
  const hasKarapanza=urbs.some(f=>f.properties?.id==='URB-KARAPANZA-CORAZON-III'||f.properties?.nombre==='Karapanza de Corazón III')
  if (!demoU.length && !demoL.length && !demoP.length && hasKarapanza) return
  if (!pgStore && fs.existsSync(STORE)) {
    const backup=STORE+'.antes-karapanza-'+new Date().toISOString().replace(/[:.]/g,'-')+'.bak'
    fs.copyFileSync(STORE,backup)
    console.log('GeoMax: respaldo previo a la migración:',backup)
  }
  db.collections.urbanizaciones.features=urbs.filter(f=>!demoU.includes(f))
  db.collections.lotes.features=lotes.filter(f=>!demoL.includes(f))
  db.collections.puntos.features=pois.filter(f=>!demoP.includes(f))
  const newUrbs=seedCollection('urbanizaciones').features.filter(f=>f.properties?.id==='URB-KARAPANZA-CORAZON-III')
  const newLots=seedCollection('lotes').features.filter(f=>f.properties?.urbanizacion==='Karapanza de Corazón III')
  for (const f of newUrbs) if (!db.collections.urbanizaciones.features.some(u=>u.properties?.id===f.properties.id||u.properties?.nombre===f.properties.nombre)) db.collections.urbanizaciones.features.push(f)
  for (const f of newLots) if (!db.collections.lotes.features.some(l=>l.properties?.id===f.properties.id)) db.collections.lotes.features.push(f)
  db.audit.push({id:id(),fecha:now(),usuarioId:'sistema',usuario:'sistema',nombre:'Migración de datos',accion:'importacion_karapanza',detalle:`Sustituida urbanización de demostración. ${newLots.length} lotes de Karapanza cargados como vendidos.`,referencia:'URB-KARAPANZA-CORAZON-III'})
  await save()
  console.log('GeoMax: Karapanza de Corazón III incorporada; datos de usuarios preservados.')
}
// Incorporación conservadora: agrega Mi Futuro a bases existentes sin borrar ni
// sustituir urbanizaciones, lotes, áreas protegidas, compradores o cuentas.
// En bases nuevas, los archivos GeoJSON iniciales ya incluyen estos registros.
async function migrateMiFuturo() {
  db.migrations ||= []
  db.collections.areas ||= {type:'FeatureCollection',features:[]}
  const migrationKey='geo-mi-futuro-v1-2026'
  if(db.migrations.includes(migrationKey))return
  const proposedUrban=seedCollection('urbanizaciones').features.find(f=>f.properties?.id==='URB-MI-FUTURO')
  const proposedLots=seedCollection('lotes').features.filter(f=>f.properties?.urbanizacion==='Mi Futuro')
  const proposedAreas=seedCollection('areas').features.filter(f=>f.properties?.urbanizacion==='Mi Futuro')
  if(!proposedUrban || proposedLots.length!==23)
    throw new Error('Plano Mi Futuro incompleto: no se importan registros parciales.')
  if(!pgStore && fs.existsSync(STORE)) {
    const backup=STORE+'.antes-mi-futuro-'+new Date().toISOString().replace(/[:.]/g,'-')+'.bak'
    fs.copyFileSync(STORE,backup)
    console.log('GeoMax: respaldo previo a Mi Futuro:',backup)
  }
  const urbanExists=collection('urbanizaciones').some(u=>
    u.properties.id===proposedUrban.properties.id ||
    u.properties.nombre?.toLocaleLowerCase('es')===proposedUrban.properties.nombre.toLocaleLowerCase('es'))
  if(!urbanExists)collection('urbanizaciones').push(proposedUrban)
  let added=0
  for(const lot of proposedLots){
    const found=collection('lotes').some(existing=>
      existing.properties.id===lot.properties.id ||
      (existing.properties.urbanizacion==='Mi Futuro' &&
       existing.properties.codigo?.toLocaleLowerCase('es')===lot.properties.codigo.toLocaleLowerCase('es')))
    if(!found){collection('lotes').push(lot);added++}
  }
  for(const area of proposedAreas){
    if(!db.collections.areas.features.some(f=>f.properties?.id===area.properties.id))
      db.collections.areas.features.push(area)
  }
  db.migrations.push(migrationKey)
  db.audit.push({id:id(),fecha:now(),usuarioId:'sistema',usuario:'sistema',
    nombre:'Actualización cartográfica',accion:'importacion_mi_futuro',
    detalle:`Urbanización Mi Futuro incorporada. ${added} lotes añadidos con estado comercial por confirmar. Zonas protegidas conservadas.`,
    referencia:proposedUrban.properties.id})
  await save()
  console.log(`GeoMax: Mi Futuro disponible (${added} lotes nuevos); datos anteriores conservados.`)
}

async function save() {
  if (pgStore) return await pgStore.save(structuredClone(db))
  fs.mkdirSync(path.dirname(STORE), {recursive:true})
  const temp = STORE + '.' + process.pid + '.tmp'
  fs.writeFileSync(temp, JSON.stringify(db, null, 2), 'utf8')
  fs.renameSync(temp, STORE)
}
function snapshot() { return structuredClone(db) }
async function audit(user, action, detail = '', reference = '') {
  db.audit.push({
    id:id(), fecha:now(), usuarioId:user.id, usuario:user.usuario,
    nombre:user.nombre, accion:action,
    detalle:String(detail || '').slice(0,400), referencia:String(reference || '').slice(0,100)
  })
  if (db.audit.length > 15000) db.audit = db.audit.slice(-15000)
  await save()
}
function publicUser(u) { return {id:u.id, usuario:u.usuario, nombre:u.nombre, rol:u.rol, activo:u.activo!==false, creado:u.creado} }
function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  return salt + ':' + crypto.scryptSync(password, salt, 64).toString('hex')
}
function verifyPassword(password, stored) {
  if (!stored || !stored.includes(':')) return false
  const [salt, hex] = stored.split(':')
  const expected = Buffer.from(hex, 'hex')
  const got = crypto.scryptSync(password, salt, 64)
  return expected.length === got.length && crypto.timingSafeEqual(expected, got)
}
function send(res, status, value) {
  res.writeHead(status, {
    'Content-Type':'application/json; charset=utf-8', 'Cache-Control':'no-store',
    'X-Content-Type-Options':'nosniff', 'X-Frame-Options':'DENY',
    'Referrer-Policy':'no-referrer'
  })
  res.end(JSON.stringify(value))
}
function error(status, message) { return Object.assign(new Error(message), {status}) }
async function body(req) {
  return await new Promise((resolve, reject) => {
    let payload = '', done = false
    req.on('data', chunk => {
      if (done) return
      payload += chunk.toString('utf8')
      if (Buffer.byteLength(payload) > 2_000_000) {
        done = true
        reject(error(413, 'El archivo o solicitud supera el tamaño admitido de 2 MB.'))
      }
    })
    req.on('end', () => {
      if (done) return
      try { resolve(JSON.parse(payload || '{}')) }
      catch { reject(error(400, 'El contenido JSON no es válido.')) }
    })
    req.on('error', reject)
  })
}
function keyFor(token) {return crypto.createHash('sha256').update(token).digest('hex')}
function authUser(req) {
  const token = req.headers.authorization?.match(/^Bearer ([a-f0-9]{64})$/i)?.[1]
  if (!token) return null
  const key = keyFor(token)
  const session = sessions.get(key)
  if (!session || session.expires < Date.now()) { sessions.delete(key); return null }
  const user = db.users.find(u => u.id === session.userId && u.activo !== false)
  if (!user) {sessions.delete(key);return null}
  return user
}
function requireUser(req, res, roles = null) {
  const user = authUser(req)
  if (!user) {send(res, 401, {error:'Debes iniciar sesión nuevamente.'});return null}
  if (roles && !roles.includes(user.rol)) {send(res, 403, {error:'Tu cuenta no tiene permisos para esta acción.'});return null}
  return user
}
function newToken(user) {
  const token = crypto.randomBytes(32).toString('hex')
  sessions.set(keyFor(token), {userId:user.id,expires:Date.now()+8*60*60*1000})
  return token
}
function userInput(b, currentId = '') {
  const usuario = String(b.usuario || '').trim().toLowerCase()
  const nombre = String(b.nombre || '').trim()
  const password = String(b.contrasena || '')
  if (!/^[a-z0-9._-]{3,30}$/.test(usuario)) throw error(400, 'El usuario admite de 3 a 30 caracteres, letras, números y ._-')
  if (nombre.length < 3 || nombre.length > 90) throw error(400, 'El nombre debe tener entre 3 y 90 caracteres.')
  if (password.length < 10 || password.length > 128) throw error(400, 'La contraseña debe tener entre 10 y 128 caracteres.')
  if (db.users.some(u => u.usuario === usuario && u.id !== currentId)) throw error(409, 'Ese usuario ya existe.')
  return {usuario, nombre, password}
}
function checkRate(req, username) {
  const k = String(req.socket.remoteAddress) + ':' + username
  const record = attempts.get(k), time = Date.now()
  if (record && time - record.first < 900000 && record.count >= 10) throw error(429, 'Demasiados intentos. Prueba en 15 minutos.')
  if (!record || time-record.first >= 900000) attempts.set(k, {first:time,count:1})
  else record.count++
  return k
}
const limited = (v, max = 200) => String(v??'').trim().slice(0,max)
function number(v, name, {required=false, min=0, max=1e12} = {}) {
  if (v === '' || v === null || v === undefined) {
    if (required) throw error(400, `Falta ${name}.`)
    return null
  }
  const n = Number(v)
  if (!Number.isFinite(n) || n < min || n > max) throw error(400, `${name} debe ser un número válido.`)
  return n
}
const samePoint = (a,b) => a[0] === b[0] && a[1] === b[1]
function validPoint(pt) {
  return Array.isArray(pt) && pt.length >= 2 && Number.isFinite(pt[0]) && Number.isFinite(pt[1]) && Math.abs(pt[0])<=180 && Math.abs(pt[1])<=90
}
function geometryOf(geometry, kind) {
  if (!geometry || typeof geometry !== 'object') throw error(400,'Debes indicar una geometría válida.')
  if (kind === 'puntos') {
    if (geometry.type !== 'Point' || !validPoint(geometry.coordinates)) throw error(400,'El punto necesita coordenadas [longitud, latitud].')
    return {type:'Point', coordinates:geometry.coordinates.slice(0,2)}
  }
  if (geometry.type !== 'Polygon' || !Array.isArray(geometry.coordinates) || !geometry.coordinates.length)
    throw error(400,'La geometría debe ser un polígono GeoJSON.')
  const rings = geometry.coordinates
  if (rings.length > 10) throw error(400,'Demasiados anillos en el polígono.')
  const safe = rings.map(ring => {
    if (!Array.isArray(ring) || ring.length < 4 || ring.length > 1500 || !ring.every(validPoint) || !samePoint(ring[0],ring[ring.length-1]))
      throw error(400,'El polígono necesita al menos tres vértices y el primer punto debe repetirse al final.')
    return ring.map(p => p.slice(0,2))
  })
  return {type:'Polygon',coordinates:safe}
}
function protectedArea(feature) {
  const p=feature?.properties || {}
  const terms=[p.tipo,p.categoria,p.clasificacion,p.clase,p.uso_suelo,p.tipo_uso,p.uso,p.nombre]
    .map(value=>String(value || '').toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replaceAll('_',' '))
  return p.solo_lectura===true || terms.some(text =>
    /areas? verdes?|zonas? verdes?|equipamiento|areas? protegidas?/.test(text))
}
function collection(key) {return db.collections[key].features}
function lookup(key, fid) {return collection(key).find(f => String(f.properties.id) === fid)}
function inputFeature(key,b, old=null) {
  const geometry = geometryOf(b.geometry || old?.geometry, key)
  const p = b.properties || b
  let properties = {...(old?.properties || {})}
  if (key === 'urbanizaciones') {
    const nombre = limited(p.nombre,100)
    if (nombre.length < 3) throw error(400,'El nombre de urbanización es obligatorio.')
    if (collection('urbanizaciones').some(f => f.properties.nombre.toLowerCase() === nombre.toLowerCase() && f.properties.id !== old?.properties.id))
      throw error(409,'Ya existe una urbanización con ese nombre.')
    properties = {...properties, nombre, ciudad:'Sucre', descripcion:limited(p.descripcion,400)}
  } else if (key === 'lotes') {
    const codigo = limited(p.codigo,80), urb = limited(p.urbanizacion,100)
    if (!codigo) throw error(400,'Introduce el código del lote.')
    if (collection('lotes').some(f=>f.properties.codigo.toLowerCase()===codigo.toLowerCase() &&
      f.properties.urbanizacion?.toLowerCase()===urb.toLowerCase() && f.properties.id!==old?.properties.id))
      throw error(409,'Ya existe un lote con ese código en esta urbanización.')
    if (!lookup('urbanizaciones',urb) && !collection('urbanizaciones').some(f=>f.properties.nombre===urb))
      throw error(400,'Selecciona una urbanización registrada.')
    const estado = limited(p.estado || 'disponible')
    if(!validStates.has(estado)) throw error(400,'Estado de lote no válido.')
    properties = {...properties,codigo, urbanizacion:urb, estado,
      manzano:limited(p.manzano,60), superficie_m2:number(p.superficie_m2,'La superficie',{min:0,max:1e9}),
      precio:number(p.precio,'El precio',{min:0,max:1e12}), observaciones:limited(p.observaciones,400),
      // Plan manual por lote, expresado en dólares. La cuota mensual NO es editable.
      precio_usd:limited(p.precio_usd,32),
      cuota_inicial_usd:limited(p.cuota_inicial_usd,32),
      plazo_meses:p.plazo_meses===''||p.plazo_meses===null||p.plazo_meses===undefined?null:Number(p.plazo_meses),
      tipo_cambio:limited(p.tipo_cambio,10),
      promocion:limited(p.promocion,70),
      vigencia_cotizacion_dias:estado==='reservado'?number(p.vigencia_cotizacion_dias,'La vigencia en días',{min:1,max:365}):null,
      fecha_venta:(()=>{
        if(estado!=='vendido')return null
        const text=limited(p.fecha_venta,10)
        if(!text)return null // El dato histórico puede estar pendiente y completarse posteriormente.
        if(!/^\d{4}-\d{2}-\d{2}$/.test(text) || Number.isNaN(Date.parse(text)) || new Date(text).toISOString().slice(0,10)!==text || text>new Date().toISOString().slice(0,10))
          throw error(400,'Introduce una fecha de venta válida que no sea futura.')
        return text
      })(),
      servicios:(() => {
        const supplied=p.servicios??[]
        if(!Array.isArray(supplied) || supplied.some(x=>!knownQuoteServices.has(x)))
          throw error(400,'Selecciona los servicios ofrecidos mediante las opciones disponibles.')
        return [...new Set(supplied)]
      })()}
    const terms=['precio_usd','cuota_inicial_usd','plazo_meses','tipo_cambio']
    const filled=terms.filter(name=>properties[name]!==''&&properties[name]!==null&&properties[name]!==undefined)
    if(filled.length===terms.length){
      try{Object.assign(properties,calcularFinanciamiento(properties))}
      catch(e){throw error(400,e.message)}
    }else{
      // Incompletos: permitidos para guardado progresivo, pero no para emitir cotización.
      properties.cuota_mensual_bs_exacta=null
      properties.cuota_mensual_bs_fraccion=null
      properties.saldo_usd_exacto=null
    }
  } else if (key === 'puntos') {
    const nombre = limited(p.nombre,100)
    if (!nombre) throw error(400,'El punto de interés necesita nombre.')
    const tipo = limited(p.tipo,40)
    if (!['colegio','salud','transporte','comercio','otro'].includes(tipo)) throw error(400,'El tipo de punto no es válido.')
    properties = {...properties,nombre,tipo,descripcion:limited(p.descripcion,400)}
  }
  properties.id = old?.properties.id || ({lotes:'L-',urbanizaciones:'URB-',puntos:'POI-'})[key]+id().slice(0,8).toUpperCase()
  return {type:'Feature', properties, geometry}
}
const collectionRoute = {
  '/api/urbanizaciones':'urbanizaciones', '/api/urbanizations':'urbanizaciones',
  '/api/lots':'lotes', '/api/puntos':'puntos', '/api/pois':'puntos'
}
const changeLabels = {urbanizaciones:'urbanización',lotes:'lote',puntos:'punto de interés'}
// Los datos personales se guardan en operaciones internas, NUNCA en propiedades GeoJSON.
// Solo Admin y Editor pueden consultar estas operaciones y notificaciones.
function personInput(input) {
  const b = input && typeof input === 'object' ? input : {}
  const contact = {
    nombre:limited(b.nombre,70), apellido:limited(b.apellido,80),
    ci:limited(b.ci,30), numero:limited(b.numero,22), numeroRef:limited(b.numeroRef,22)
  }
  if (contact.nombre.length < 2 || contact.apellido.length < 2)
    throw error(400,'Indica nombre y apellido de la persona (mínimo 2 caracteres cada uno).')
  if (!/^[A-Za-z0-9\- .]{4,30}$/.test(contact.ci))
    throw error(400,'Introduce un CI válido (4 a 30 caracteres).')
  for(const [key,label] of [['numero','Número de celular'],['numeroRef','Número de referencia']]) {
    const digits=contact[key].replace(/\D/g,'')
    if (digits.length < 7 || digits.length > 15 || !/^\+?[\d() .-]+$/.test(contact[key]))
      throw error(400,`${label}: escribe entre 7 y 15 dígitos, con código de país opcional.`)
  }
  return contact
}
function transitionData(actor, lot, target, payload = {}) {
  const previous = lot.properties.estado || 'disponible'
  if (!validStates.has(target)) throw error(400,'Estado de lote inválido.')
  if (previous === target) return null
  if (previous === 'vendido' && actor.rol !== 'admin')
    throw error(403,'Solo Administración puede revertir o modificar una venta registrada.')
  if (target === 'disponible' || target === 'pendiente') return {target,previous}
  const contacto=personInput(payload.persona)
  if (target === 'reservado') {
    const fecha=Date.parse(String(payload.reservaVenceEn || ''))
    if (!Number.isFinite(fecha) || fecha <= Date.now() || fecha > Date.now() + 365*24*3600*1000)
      throw error(400,'La fecha y hora límite de la reserva deben ser futuras y como máximo de un año.')
    return {target,previous,contacto,reservaVenceEn:new Date(fecha).toISOString()}
  }
  const modalidad=limited(payload.modalidad,40).toLowerCase()
  if (!purchaseModes.has(modalidad)) throw error(400,'Elige una modalidad de compra válida.')
  const detalleModalidad=modalidad==='otro'?limited(payload.detalleModalidad,100):''
  if (modalidad==='otro' && detalleModalidad.length<3)
    throw error(400,'Describe la modalidad de compra.')
  return {target,previous,contacto,modalidad,detalleModalidad}
}
function commitTransition(actor, lot, transaction) {
  if (!transaction) return false
  const previousOp=db.operations.find(x=>x.id===lot.properties.ultimaOperacionId)
  if (previousOp && previousOp.estado==='activa')
    previousOp.estado=transaction.target==='vendido'?'convertida':'cancelada'
  lot.properties.estado=transaction.target
  if(transaction.target!=='vendido') lot.properties.fecha_venta=null
  if(transaction.target!=='reservado') lot.properties.vigencia_cotizacion_dias=null
  lot.properties.reservaVenceEn=null
  lot.properties.ultimaOperacionId=null
  if(['reservado','vendido'].includes(transaction.target)) {
    const op={
      id:id(),lotId:lot.properties.id,codigo:lot.properties.codigo,
      urbanizacion:lot.properties.urbanizacion,tipo:transaction.target,
      persona:transaction.contacto,creado:now(),usuarioId:actor.id,
      usuario:actor.usuario,estado:transaction.target==='reservado'?'activa':'registrada',
      reservaVenceEn:transaction.reservaVenceEn || null,
      modalidad:transaction.modalidad || null,
      detalleModalidad:transaction.detalleModalidad || ''
    }
    db.operations.push(op)
    lot.properties.ultimaOperacionId=op.id
    if(transaction.target==='reservado')lot.properties.reservaVenceEn=op.reservaVenceEn
  }
  return true
}
// Proceso del servidor: se ejecuta aunque no haya ninguna pestaña abierta.
// Las reservas vencidas durante una caída se resuelven al reiniciar la API.
async function expireReservations() {
  const current=Date.now()
  let changes=0
  for (const op of db.operations) {
    if(op.tipo!=='reservado' || op.estado!=='activa')continue
    if(!op.reservaVenceEn || Date.parse(op.reservaVenceEn)>current)continue
    const lot=lookup('lotes',op.lotId)
    if(!lot || lot.properties.estado!=='reservado' || lot.properties.ultimaOperacionId!==op.id) {
      op.estado='cancelada'; changes++;continue
    }
    op.estado='vencida'
    lot.properties.estado='disponible'
    lot.properties.reservaVenceEn=null
    lot.properties.ultimaOperacionId=null
    db.notifications.push({id:id(),fecha:now(),tipo:'reserva_vencida',lotId:op.lotId,
      codigo:op.codigo,urbanizacion:op.urbanizacion,operationId:op.id,
      mensaje:`La reserva del lote ${op.codigo} venció y el lote volvió a disponible.`,leidoPor:[]})
    db.audit.push({id:id(),fecha:now(),usuarioId:'sistema',usuario:'sistema',
      nombre:'Sistema automático',accion:'vencimiento_reserva',
      detalle:`${op.codigo}: reservado → disponible (plazo cumplido)`,referencia:op.lotId})
    changes++
  }
  if(changes){
    if(db.notifications.length>3000)db.notifications=db.notifications.slice(-3000)
    if(db.audit.length>15000)db.audit=db.audit.slice(-15000)
    await save()
    console.log(`GeoMax: ${changes} reserva(s) vencidas o canceladas.`)
  }
  return changes
}
function summary() {
  const byStatus = {pendiente:0,disponible:0,reservado:0,vendido:0}
  const perUrbanizacion = {}
  for (const u of collection('urbanizaciones')) perUrbanizacion[u.properties.nombre] = {nombre:u.properties.nombre,total:0,...Object.fromEntries(Object.keys(byStatus).map(k=>[k,0]))}
  for (const lot of collection('lotes')) {
    const {estado, urbanizacion} = lot.properties
    if (estado in byStatus) byStatus[estado]++
    perUrbanizacion[urbanizacion] ||= {nombre:urbanizacion,total:0,pendiente:0,disponible:0,reservado:0,vendido:0}
    perUrbanizacion[urbanizacion].total++
    if (estado in byStatus) perUrbanizacion[urbanizacion][estado]++
  }
  return {urbanizaciones:collection('urbanizaciones').length,lotes:collection('lotes').length,
    puntos:collection('puntos').length,cotizaciones:db.quotes.length,
    estados:byStatus,porUrbanizacion:Object.values(perUrbanizacion)}
}
async function route(req,res) {
  const url = new URL(req.url,'http://localhost:3001')
  const p = url.pathname, method = req.method
  await expireReservations()
  if (method==='GET' && p==='/api/health') {
    const status=pgStore ? await pgStore.health() : {connected:false}
    return send(res,200,{ok:true,storage:pgStore?'postgresql-postgis':'json-local',service:'GeoMax',database:status.connected})
  }
  if (method==='GET' && p==='/api/auth/setup') return send(res,200,{needsSetup:db.users.length===0})
  if (method==='POST' && p==='/api/auth/setup') {
    if (db.users.length) throw error(409,'La cuenta administradora inicial ya fue creada.')
    const b=await body(req),v=userInput(b)
    const user={id:id(),nombre:v.nombre,usuario:v.usuario,rol:'admin',activo:true,hash:hashPassword(v.password),creado:now()}
    db.users.push(user)
    await audit(user,'creacion_cuenta_inicial','Administrador inicial')
    await audit(user,'inicio_sesion','Primer acceso')
    return send(res,201,{token:newToken(user),user:publicUser(user)})
  }
  if (method==='POST' && p==='/api/auth/login') {
    const b=await body(req), username=limited(b.usuario,30).toLowerCase()
    const rateKey=checkRate(req,username)
    const u=db.users.find(x=>x.usuario===username)
    if(!u || u.activo===false || !verifyPassword(String(b.contrasena??''),u.hash))
      throw error(401,'Usuario o contraseña incorrectos, o cuenta desactivada.')
    attempts.delete(rateKey)
    await audit(u,'inicio_sesion','Acceso al geovisor')
    return send(res,200,{token:newToken(u),user:publicUser(u)})
  }
  if(method==='GET' && p==='/api/auth/me') {
    const u=requireUser(req,res);if(!u)return
    return send(res,200,{user:publicUser(u)})
  }
  if(method==='POST' && p==='/api/auth/logout') {
    const u=requireUser(req,res);if(!u)return
    const token=req.headers.authorization?.slice(7)
    sessions.delete(keyFor(token))
    await audit(u,'cierre_sesion','Salida del sistema')
    return send(res,200,{ok:true})
  }
  if(method==='GET'&&p==='/api/users') {
    const u=requireUser(req,res,['admin']);if(!u)return
    return send(res,200,{users:db.users.map(publicUser)})
  }
  if(method==='POST'&&p==='/api/users') {
    const actor=requireUser(req,res,['admin']);if(!actor)return
    const b=await body(req),v=userInput(b)
    const rol=validRoles.has(b.rol)?b.rol:'lector'
    const u={id:id(),usuario:v.usuario,nombre:v.nombre,hash:hashPassword(v.password),rol,activo:true,creado:now()}
    db.users.push(u)
    await audit(actor,'creacion_usuario',`${u.usuario} (${rol})`,u.id)
    return send(res,201,{user:publicUser(u)})
  }
  const userMatch=p.match(/^\/api\/users\/([0-9a-f-]+)$/i)
  if(method==='PATCH' && userMatch) {
    const actor=requireUser(req,res,['admin']);if(!actor)return
    const target=db.users.find(u=>u.id===userMatch[1]);if(!target)throw error(404,'Usuario no encontrado.')
    const b=await body(req)
    const rol=b.rol===undefined?target.rol:String(b.rol)
    if(!validRoles.has(rol))throw error(400,'Rol no válido.')
    const activo=b.activo===undefined?target.activo!==false:b.activo===true
    const nombre=b.nombre===undefined?target.nombre:limited(b.nombre,90)
    if(nombre.length<3)throw error(400,'El nombre debe tener al menos 3 caracteres.')
    if(target.id===actor.id && (!activo || rol!=='admin')) throw error(400,'No puedes desactivar o degradar tu propia cuenta de administrador.')
    const admins=db.users.filter(u=>u.rol==='admin'&&u.activo!==false)
    if(target.rol==='admin' && target.activo!==false && (rol!=='admin'||!activo) && admins.length<=1)
      throw error(400,'Debe permanecer al menos un administrador activo.')
    target.nombre=nombre;target.rol=rol;target.activo=activo
    const credentialsChanged=(!activo || b.contrasena!==undefined && b.contrasena!=='')
    if(b.contrasena!==undefined && b.contrasena!=='') {
      if(String(b.contrasena).length<10 || String(b.contrasena).length>128)throw error(400,'La nueva contraseña debe tener de 10 a 128 caracteres.')
      target.hash=hashPassword(String(b.contrasena))
    }
    if(credentialsChanged)for(const [key,session] of sessions)if(session.userId===target.id)sessions.delete(key)
    await audit(actor,'modificacion_usuario',`${target.usuario}: rol ${rol}, ${activo?'activo':'inactivo'}`,target.id)
    return send(res,200,{user:publicUser(target)})
  }
  if(method==='GET'&&p==='/api/audit') {
    const u=requireUser(req,res);if(!u)return
    const scope=url.searchParams.get('scope')==='all'&&u.rol==='admin'?'all':'me'
    const max=Math.min(500, Math.max(1, Number(url.searchParams.get('limit'))||120))
    const records=(scope==='all'?db.audit:db.audit.filter(a=>a.usuarioId===u.id))
    return send(res,200,{entries:records.slice(-max).reverse(),total:records.length})
  }
  if(method==='POST'&&p==='/api/audit') {
    const u=requireUser(req,res);if(!u)return
    const b=await body(req)
    if(!allowedActions.has(b.accion))throw error(400,'Acción de bitácora no permitida.')
    await audit(u,b.accion,b.detalle,b.referencia)
    return send(res,201,{ok:true})
  }
  if(method==='GET'&&p==='/api/summary') {
    const u=requireUser(req,res);if(!u)return
    return send(res,200,summary())
  }
  if(method==='GET'&&p==='/api/search') {
    const u=requireUser(req,res);if(!u)return
    const q=limited(url.searchParams.get('q'),100).toLocaleLowerCase('es-BO')
    if(!q)return send(res,200,{results:[]})
    const fields={urbanizaciones:['nombre'],lotes:['codigo','manzano','urbanizacion'],puntos:['nombre','tipo']}
    const results=[]
    for(const [key,keys] of Object.entries(fields))for(const f of collection(key)){
      if(keys.some(k=>String(f.properties[k]||'').toLocaleLowerCase('es-BO').includes(q)))
        results.push({id:f.properties.id,tipo:key,nombre:f.properties.nombre||f.properties.codigo,properties:f.properties,geometry:f.geometry})
      if(results.length>=30)break
    }
    return send(res,200,{results:results.slice(0,30)})
  }
  if(method==='GET'&&p==='/api/notifications') {
    const u=requireUser(req,res,['admin','editor']);if(!u)return
    const items=db.notifications.slice(-100).reverse().map(note=>{
      const op=db.operations.find(item=>item.id===note.operationId)
      return {...note,leida:note.leidoPor.includes(u.id),
        contacto:op?{nombre:op.persona.nombre,apellido:op.persona.apellido,numero:op.persona.numero}:null}
    })
    return send(res,200,{notifications:items,unread:items.filter(n=>!n.leida).length})
  }
  const readNotification=p.match(/^\/api\/notifications\/([0-9a-f-]+)\/read$/i)
  if(method==='POST'&&readNotification){
    const u=requireUser(req,res,['admin','editor']);if(!u)return
    const note=db.notifications.find(n=>n.id===readNotification[1]);if(!note)throw error(404,'Notificación no encontrada.')
    if(!note.leidoPor.includes(u.id)){note.leidoPor.push(u.id);await save()}
    return send(res,200,{ok:true})
  }
  if(method==='GET'&&p==='/api/lot-operations'){
    const u=requireUser(req,res,['admin','editor']);if(!u)return
    const lotId=limited(url.searchParams.get('lotId'),100)
    if(!lotId)throw error(400,'Indica el lote que deseas consultar.')
    return send(res,200,{operations:db.operations.filter(op=>op.lotId===lotId).slice(-50).reverse()})
  }
  if(p==='/api/areas') {
    const u=requireUser(req,res);if(!u)return
    if(method!=='GET')throw error(405,'Las áreas protegidas son de solo lectura.')
    return send(res,200,{type:'FeatureCollection',features:db.collections.areas?.features||[]})
  }
  const routeGroup=p.match(/^\/api\/(urbanizaciones|urbanizations|lots|puntos|pois)(?:\/([\w-]+))?(?:\/(history))?$/)
  if(routeGroup) {
    const key=collectionRoute['/api/'+routeGroup[1]], fid=routeGroup[2], history=routeGroup[3]
    if(method==='GET' && !fid) {
      const u=requireUser(req,res);if(!u)return
      return send(res,200,{type:'FeatureCollection',features:collection(key)})
    }
    if(method==='GET'&&fid&&history&&key==='lotes') {
      const u=requireUser(req,res);if(!u)return
      return send(res,200,{entries:db.audit.filter(e=>e.referencia===fid).slice(-120).reverse()})
    }
    if(method==='POST' && !fid) {
      const u=requireUser(req,res,['admin','editor']);if(!u)return
      const b=await body(req), feature=inputFeature(key,b)
      if(key==='lotes'){
        const target=feature.properties.estado
        feature.properties.estado='disponible'
        const transaction=transitionData(u,feature,target,b.operacion)
        commitTransition(u,feature,transaction)
      }
      collection(key).push(feature)
      await audit(u,'creacion_'+key,feature.properties.nombre||feature.properties.codigo,feature.properties.id)
      return send(res,201,{feature})
    }
    if(method==='PATCH' && fid && !history) {
      const u=requireUser(req,res,['admin','editor']);if(!u)return
      const old=lookup(key,fid);if(!old)throw error(404,'No se encontró el registro.')
      if(protectedArea(old))throw error(403,'Las áreas verdes y de equipamiento son de solo lectura.')
      const b=await body(req)
      if(key==='lotes' && b.estado && Object.keys(b).every(k=>['estado','operacion'].includes(k))) {
        const transaction=transitionData(u,old,limited(b.estado),b.operacion)
        if(transaction){
          commitTransition(u,old,transaction)
          await audit(u,'cambio_estado_lote',`${old.properties.codigo}: ${transaction.previous} → ${transaction.target}`,fid)
        }
        return send(res,200,{id:fid,estado:old.properties.estado,feature:old})
      }
      const oldName=old.properties.nombre||old.properties.codigo
      const fresh=inputFeature(key,b,old)
      const transaction=key==='lotes' ? transitionData(u,old,fresh.properties.estado,b.operacion) : null
      const idx=collection(key).indexOf(old)
      if(transaction)commitTransition(u,fresh,transaction)
      collection(key)[idx]=fresh
      if(key==='urbanizaciones' && old.properties.nombre!==fresh.properties.nombre) {
        for(const lot of collection('lotes'))if(lot.properties.urbanizacion===old.properties.nombre) lot.properties.urbanizacion=fresh.properties.nombre
      }
      if(transaction)
        await audit(u,'cambio_estado_lote',`${old.properties.codigo}: ${transaction.previous} → ${transaction.target}`,fid)
      await audit(u,'modificacion_'+key,oldName,fid)
      return send(res,200,{feature:fresh})
    }
    if(method==='DELETE' && fid && !history) {
      const u=requireUser(req,res,['admin']);if(!u)return
      const f=lookup(key,fid);if(!f)throw error(404,'No se encontró el registro.')
      if(protectedArea(f))throw error(403,'Las áreas verdes y de equipamiento no se pueden eliminar.')
      if(key==='urbanizaciones' && collection('lotes').some(l=>l.properties.urbanizacion===f.properties.nombre))
        throw error(409,'Esta urbanización tiene lotes asociados. Debes moverlos o eliminarlos primero.')
      if(key==='lotes' && (db.quotes.some(q=>q.lotId===fid) || db.operations.some(op=>op.lotId===fid)))
        throw error(409,'Este lote tiene cotizaciones, reservas o ventas asociadas y no puede eliminarse.')
      db.collections[key].features=collection(key).filter(x=>x.properties.id!==fid)
      await audit(u,'eliminacion_'+key,f.properties.nombre||f.properties.codigo,fid)
      return send(res,200,{ok:true})
    }
  }
  if(method==='GET'&&p==='/api/quotes') {
    const u=requireUser(req,res);if(!u)return
    return send(res,200,{quotes:db.quotes.slice().reverse()})
  }
  if(method==='POST'&&p==='/api/quotes') {
    const u=requireUser(req,res,['admin','editor']);if(!u)return
    const b=await body(req)
    const lot=lookup('lotes',limited(b.lotId,70))
    if(!lot)throw error(400,'Selecciona un lote registrado.')
    const client=limited(b.cliente,110)
    if(client.length<3)throw error(400,'Introduce el nombre del destinatario de la cotización.')
    const p=lot.properties
    // La cotización usa exclusivamente el plan guardado del lote; no acepta cuotas
    // enviadas por el navegador. BigInt evita errores de coma flotante y redondeos.
    const required=['precio_usd','cuota_inicial_usd','plazo_meses','tipo_cambio']
    const missing=required.filter(k=>p[k]===null||p[k]===undefined||p[k]==='')
    if(missing.length)throw error(400,'Completa el plan comercial del lote: '+missing.join(', ')+'.')
    let financing
    try{financing=calcularFinanciamiento(p)}
    catch(e){throw error(400,e.message)}
    const days=number(b.vigencia_dias,'la vigencia de esta cotización',{required:true,min:1,max:365})
    if(!Number.isInteger(days))throw error(400,'La vigencia debe indicarse en días enteros.')
    const manzano=limited(p.manzano,60)
    if(!manzano)throw error(400,'Completa el manzano en el lote antes de cotizar.')
    const surface=number(p.superficie_m2,'la superficie del lote',{required:true,min:0.01})
    const services=Array.isArray(p.servicios)?p.servicios.filter(x=>knownQuoteServices.has(x)):[]
    let cashTerms
    try{cashTerms=calcularPrecioContado(financing.precio_usd,b.descuento_contado_pct)}
    catch(e){throw error(400,e.message)}
    const issued=now()
    const expires=new Date(Date.parse(issued)+days*86400000).toISOString()
    const quote={
      id:'COT-'+id().slice(0,8).toUpperCase(),lotId:p.id,
      codigo:p.codigo,urbanizacion:p.urbanizacion,manzano,
      superficie_m2:surface,estado:p.estado,
      precioReferencia:p.precio,promocion:limited(p.promocion,70),
      ...financing,
      descuento_contado_pct:cashTerms?.descuento_contado_pct??null,
      precio_contado_usd:cashTerms?.precio_contado_usd??null,
      servicios:services,vigencia_cotizacion_dias:days,validaHasta:expires,
      cliente:client,observaciones:limited(b.observaciones,500),
      geometry:structuredClone(lot.geometry),
      fecha:issued,usuario:u.usuario,usuarioId:u.id
    }
    db.quotes.push(quote)
    await audit(u,'creacion_cotizacion',`${quote.id} · ${quote.codigo} · US$ ${financing.precio_usd}`,quote.id)
    return send(res,201,{quote})
  }
  if(method==='GET'&&p==='/api/admin/backup') {
    const u=requireUser(req,res,['admin']);if(!u)return
    const clean = snapshot()
    clean.users=clean.users.map(publicUser)
    return send(res,200,{fecha:now(),info:'Respaldo administrativo sin hashes de contraseñas ni sesiones. Contiene datos personales de reservas y ventas: conservar en lugar seguro.',data:clean})
  }
  return send(res,404,{error:'Ruta no encontrada.'})
}
// Se serializan las solicitudes del prototipo para impedir escrituras cruzadas
// entre cambios de lotes, notificaciones y vencimientos.
let pending=Promise.resolve()
function enqueue(task) {
  const next=pending.then(async()=>{
    const previous=structuredClone(db)
    try { return await task() }
    catch (err) { db=previous; throw err }
  })
  pending=next.catch(()=>{})
  return next
}
async function boot() {
  if (USE_POSTGRES) {
    pgStore=await connectPostgres()
    const stored=await pgStore.load()
    if (stored) {
      db={ ...stored, users:stored.users||[], audit:stored.audit||[],
        quotes:stored.quotes||[], operations:stored.operations||[],
        notifications:stored.notifications||[], collections:stored.collections||readData().collections }
      console.log('GeoMax: registros cargados desde PostgreSQL/PostGIS.')
    } else {
      // Primera activación: importa el JSON local sin borrarlo.
      // Es responsabilidad del administrador revisar primero su contenido.
      await pgStore.save(db)
      console.log('GeoMax: datos iniciales importados a PostgreSQL; JSON local conservado.')
    }
  }
  await migrateDemoToKarapanza()
  await migrateMiFuturo()
  await expireReservations()
  const server=http.createServer((req,res)=>{
    enqueue(()=>route(req,res)).catch(e=>{
      console.error('[GeoMax API]',e.message)
      if(!res.headersSent)send(res,e.status||503,{error:e.status?e.message:'Error interno o base de datos no disponible.'})
    })
  })
  server.listen(PORT,'127.0.0.1',()=>console.log(`GeoMax API (${pgStore?'PostgreSQL/PostGIS':'JSON local'}): http://127.0.0.1:${PORT}`))
  const worker=setInterval(()=>{
    enqueue(expireReservations).catch(e=>console.error('GeoMax vencimientos:',e.message))
  },5000)
  worker.unref()
}
boot().catch(error=>{console.error('GeoMax no puede iniciar:',error.message);process.exitCode=1})
