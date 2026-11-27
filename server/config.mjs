/** GeoMax: configuración privada del servidor (NO usar VITE_ para secretos). */
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const serverEnv = path.join(root, 'server', '.env')
if (existsSync(serverEnv) && typeof process.loadEnvFile === 'function') {
  // Respeta variables definidas por el sistema operativo.
  process.loadEnvFile(serverEnv)
}
export const USE_POSTGRES = (process.env.GEOMAX_STORAGE || 'json').toLowerCase() === 'postgres'
