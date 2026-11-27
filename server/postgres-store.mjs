/**
 * Persistencia PostgreSQL/PostGIS para GeoMax (modo opcional).
 * Mantiene el contrato de la API existente y centraliza los datos en PostgreSQL.
 * La tabla estado es fuente de verdad JSONB; las 3 tablas *_geo exponen
 * copias geográficas consultables con funciones PostGIS.
 * NO modifica las tablas antiguas del esquema public.
 */
import fs from 'node:fs'

export async function connectPostgres() {
  let Pool
  try { ({ Pool } = await import('pg')) }
  catch { throw new Error('Falta el controlador pg. En GeoMax ejecuta: npm install pg') }

  const connectionString = process.env.GEOMAX_DATABASE_URL?.trim()
  const config = connectionString ? { connectionString } : {
    host: process.env.PGHOST || '127.0.0.1',
    port: Number(process.env.PGPORT || 5432),
    database: process.env.PGDATABASE || 'geomax_db',
    user: process.env.PGUSER || 'postgres',
    password: process.env.PGPASSWORD || undefined
  }
  if ((process.env.GEOMAX_DB_SSL || 'disable') === 'require') {
    config.ssl = { rejectUnauthorized: true }
    if (process.env.GEOMAX_DB_CA_PATH) config.ssl.ca = fs.readFileSync(process.env.GEOMAX_DB_CA_PATH,'utf8')
  }
  const pool = new Pool({ ...config, max: 4, connectionTimeoutMillis: 6000,
    idleTimeoutMillis: 20000, application_name: 'geomax-api' })
  try {
    await pool.query('SELECT 1')
    const check = await pool.query("SELECT to_regclass('geomax_app.estado') AS table_name")
    if (!check.rows[0]?.table_name) {
      throw new Error('No existe geomax_app.estado. Ejecuta el SQL database/05_conexion_postgres_postgis.sql en geomax_db.')
    }
  } catch (err) {
    await pool.end()
    throw new Error('No fue posible preparar PostgreSQL: ' + err.message)
  }
  return {
    async load() {
      const result = await pool.query('SELECT datos FROM geomax_app.estado WHERE id=1')
      return result.rows[0]?.datos ?? null
    },
    async save(data) {
      const client=await pool.connect()
      try {
        await client.query('BEGIN')
        await client.query(`INSERT INTO geomax_app.estado (id,datos,actualizado)
          VALUES (1,$1::jsonb,NOW())
          ON CONFLICT(id) DO UPDATE SET datos=EXCLUDED.datos, actualizado=NOW()`,
          [JSON.stringify(data)])
        // Copias cartográficas PostGIS, sincronizadas con el mismo COMMIT.
        const collections=data.collections||{}
        for (const [key,table] of [
          ['lotes','lotes_geo'], ['puntos','puntos_geo'], ['urbanizaciones','urbanizaciones_geo']
        ]) {
          // No se usan estas tablas como origen de la información; son proyecciones de la fuente JSONB.
          await client.query(`DELETE FROM geomax_app.${table}`)
          for (const feature of collections[key]?.features||[]) {
            const {id,...properties}=feature.properties||{}
            if (!id || !feature.geometry) continue
            await client.query(`INSERT INTO geomax_app.${table} (id,propiedades,geom)
              VALUES ($1,$2::jsonb,ST_SetSRID(ST_GeomFromGeoJSON($3),4326))`,
              [String(id),JSON.stringify(properties),JSON.stringify(feature.geometry)])
          }
        }
        await client.query('COMMIT')
      } catch (err) {
        await client.query('ROLLBACK').catch(()=>{})
        throw err
      } finally {client.release()}
    },
    async health() {
      const r=await pool.query('SELECT NOW() AS fecha')
      return {connected:true,serverTime:r.rows[0]?.fecha}
    },
    async close() {await pool.end()}
  }
}
