-- GEOMAX / MAX INVERSIONES
-- MODELO DE REFERENCIA para una futura migración a PostgreSQL/PostGIS.
-- ¡Este archivo NO está conectado a la API JSON local incluida en el ZIP!
-- Antes de migrar hay que implementar adaptadores SQL, migración de datos,
-- sesiones seguras, control de acceso, transacciones y copias de seguridad.
-- Ejecutar en una base PostgreSQL vacía con PostGIS instalado.
BEGIN;
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE TABLE IF NOT EXISTS usuarios (
  id UUID PRIMARY KEY,
  usuario VARCHAR(30) NOT NULL UNIQUE,
  nombre VARCHAR(90) NOT NULL,
  hash_clave TEXT NOT NULL,
  rol VARCHAR(12) NOT NULL CHECK(rol IN ('admin','editor','lector')),
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  creado TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS urbanizaciones (
  id VARCHAR(80) PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL UNIQUE,
  descripcion TEXT,
  ciudad VARCHAR(80) NOT NULL DEFAULT 'Sucre',
  geom geometry(Polygon,4326) NOT NULL
);
CREATE TABLE IF NOT EXISTS lotes (
  id VARCHAR(80) PRIMARY KEY,
  urbanizacion_id VARCHAR(80) NOT NULL REFERENCES urbanizaciones(id),
  codigo VARCHAR(80) NOT NULL UNIQUE,
  manzano VARCHAR(60),
  superficie_m2 NUMERIC(14,2) CHECK(superficie_m2>=0),
  precio NUMERIC(14,2) CHECK(precio>=0),
  estado VARCHAR(15) NOT NULL CHECK(estado IN ('disponible','reservado','vendido')),
  observaciones TEXT,
  geom geometry(Polygon,4326) NOT NULL
);
CREATE TABLE IF NOT EXISTS puntos_interes (
  id VARCHAR(80) PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  tipo VARCHAR(40) NOT NULL,
  descripcion TEXT,
  geom geometry(Point,4326) NOT NULL
);
CREATE TABLE IF NOT EXISTS cotizaciones (
  id VARCHAR(80) PRIMARY KEY,
  lote_id VARCHAR(80) NOT NULL REFERENCES lotes(id) ON DELETE RESTRICT,
  cliente VARCHAR(110) NOT NULL,
  importe NUMERIC(14,2) NOT NULL CHECK(importe>0),
  codigo_lote VARCHAR(80) NOT NULL,
  nombre_urbanizacion VARCHAR(100) NOT NULL,
  observaciones TEXT,
  usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  creada TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS bitacora (
  id UUID PRIMARY KEY,
  usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  usuario VARCHAR(30) NOT NULL,
  accion VARCHAR(100) NOT NULL,
  detalle TEXT,
  referencia VARCHAR(100),
  fecha TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS historial_lotes (
  id UUID PRIMARY KEY,
  lote_id VARCHAR(80) REFERENCES lotes(id) ON DELETE RESTRICT,
  estado_anterior VARCHAR(15),
  estado_nuevo VARCHAR(15),
  usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  observacion TEXT,
  fecha TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_urbanizaciones_geom ON urbanizaciones USING GIST(geom);
CREATE INDEX IF NOT EXISTS idx_lotes_geom ON lotes USING GIST(geom);
CREATE INDEX IF NOT EXISTS idx_puntos_geom ON puntos_interes USING GIST(geom);
CREATE INDEX IF NOT EXISTS idx_bitacora_fecha ON bitacora(fecha DESC);
COMMIT;
