# GeoMax — Sistema Web de Gestión Inmobiliaria y Geoespacial

**GeoMax** es un sistema web desarrollado para **MAX Inversiones**, en la ciudad de **Sucre, Bolivia**, destinado a centralizar la visualización cartográfica y la gestión de urbanizaciones, lotes y operaciones inmobiliarias.

La plataforma integra un geovisor interactivo basado en **Mapbox**, herramientas de administración inmobiliaria, registro de reservas y ventas, elaboración de cotizaciones, generación de reportes y control de acceso por roles. Su finalidad es facilitar la consulta de información, mantener los registros organizados y apoyar las actividades administrativas y comerciales de la empresa.

## 1. Descripción general del sistema

GeoMax permite visualizar la ubicación y distribución de urbanizaciones y lotes en un mapa interactivo, consultar sus características y actualizar su estado comercial. La interfaz se desarrolló con **React y Vite**; el servidor utiliza **Node.js** y admite almacenamiento local JSON o **PostgreSQL/PostGIS**.

La información se organiza por módulos y se muestra según el rol del usuario: **Administrador**, **Editor** o **Consulta**. El sistema está orientado al uso interno del personal autorizado de MAX Inversiones.

La cartografía incorporada incluye las urbanizaciones **Karapanza de Corazón III** (40 lotes) y **Mi Futuro** (23 lotes), situadas en el ámbito geográfico del proyecto. Las geometrías individuales digitalizadas a partir de planos deben verificarse con la documentación topográfica aprobada antes de emplearse con fines catastrales o legales.

## 2. Funcionamiento y características

La aplicación dispone de un encabezado de navegación, menú lateral, mapa principal y módulos administrativos. El usuario inicia sesión y accede a las funcionalidades autorizadas. Las operaciones se comunican con una API local que valida los permisos y persiste los cambios.

- **Visualización geográfica:** mapas de Calles, Satélite y Relieve; polígonos de urbanizaciones y lotes; capas configurables y búsqueda de ubicaciones.
- **Gestión de inmuebles:** consulta y edición de urbanizaciones, lotes y puntos de interés, según permisos.
- **Información comercial:** precio en US$, cuota inicial, plazo, tipo de cambio, promociones, servicios y cálculo exacto de mensualidades en bolivianos.
- **Operaciones:** registro de reservas con vencimiento y ventas con datos de compradores; conservación del historial.
- **Documentación:** cotizaciones con croquis y condiciones comerciales; reportes generales de lotes por urbanización, con estado y resumen de disponibilidad.
- **Seguridad y seguimiento:** inicio de sesión, roles, gestión de usuarios, bitácora y notificaciones para usuarios autorizados.

### Funciones principales por módulo

| Módulo | Funcionalidades |
|---|---|
| **Resumen general** | Estadísticas de urbanizaciones y lotes por estado. |
| **Geovisor** | Mapbox, búsqueda, zoom, medición, selección de capas y vistas Calles/Satélite/Relieve. |
| **Urbanizaciones** | Consulta, registro y actualización de urbanizaciones y geometrías. |
| **Lotes** | Datos generales, superficie, estado, precios, reservas, ventas y planes de pago. |
| **Puntos de interés** | Ubicación y administración de puntos relevantes del entorno. |
| **Cotizaciones** | Información del lote, crédito, contado, beneficios, croquis y exportación mediante impresión/PDF. |
| **Reportes** | Reporte general con N.º, lote, manzano, superficie y estado, más resumen de disponibilidad; exportación CSV/PDF. |
| **Bitácora** | Historial de acciones y modificaciones. |
| **Usuarios y permisos** | Gestión de cuentas y roles por el Administrador. |
| **Mi cuenta y notificaciones** | Datos del usuario; avisos de reservas para los roles autorizados. |

**Roles:** `admin` (administración general), `editor` (gestión y actualización autorizadas) y `lector` (consulta sin modificación de registros ni acceso a datos personales de compradores).

Las zonas de vías, áreas verdes y equipamiento identificadas como protegidas son visibles, pero no pueden editarse desde los formularios del sistema.

## 3. Requisitos e instalación

### Requisitos

- **Node.js 20.19 o superior** y npm.
- **Visual Studio Code** u otro editor de código.
- Conexión a internet para descargar dependencias y acceder a Mapbox.
- **Token público de Mapbox** (`pk...`).
- **Opcional:** PostgreSQL con PostGIS y pgAdmin para persistencia en base de datos.

### Instalación local en Windows

1. Descarga o clona el repositorio y abre la carpeta `GeoMax` (la que contiene `package.json`).
2. Instala las dependencias desde la terminal:

   ```powershell
   npm ci
   ```

3. Crea el archivo de configuración del frontend:

   ```powershell
   Copy-Item .env.example .env
   ```

4. Edita `.env` y escribe tu token público:

   ```env
   VITE_MAPBOX_TOKEN=pk.TU_TOKEN_PUBLICO
   ```

5. Inicia el servidor y la interfaz:

   ```powershell
   npm run dev
   ```

6. Abre **http://localhost:5173** en tu navegador. En la primera instalación, crea la cuenta inicial de Administrador siguiendo las indicaciones de GeoMax.

   También puedes ejecutar `INICIAR_GEOMAX.bat` después de instalar las dependencias.

### Conexión opcional con PostgreSQL/PostGIS

1. Crea la base de datos `geomax_db` en PostgreSQL y habilita PostGIS.
2. Ejecuta el archivo `database/05_conexion_postgres_postgis.sql` sobre la base creada, desde pgAdmin.
3. Instala el controlador de PostgreSQL:

   ```powershell
   npm install pg
   ```

4. Copia `server/.env.example` como `server/.env` y completa la conexión:

   ```env
   GEOMAX_STORAGE=postgres
   PGHOST=127.0.0.1
   PGPORT=5432
   PGDATABASE=geomax_db
   PGUSER=postgres
   PGPASSWORD=TU_CONTRASENA_LOCAL
   GEOMAX_DB_SSL=disable
   ```

5. Reinicia GeoMax con `npm run dev`. Para verificar el modo de almacenamiento, abre **http://127.0.0.1:3001/api/health**.

> **Importante:** si la API indica `json-local`, los registros se almacenan localmente en `server/data/geomax-local.json`, no en PostgreSQL. No copies ni publiques contraseñas reales dentro del README.

### Comandos disponibles

| Comando | Función |
|---|---|
| `npm run dev` | Inicia backend y frontend. |
| `npm run dev:server` | Inicia solo la API Node.js. |
| `npm run dev:web` | Inicia solo Vite/React. |
| `npm run build` | Genera la compilación del frontend. |
| `npm run preview` | Previsualiza la compilación generada. |

## 4. Estructura del proyecto

```text
GeoMax/
├── database/                    # SQL y coordenadas de urbanizaciones
├── public/
│   ├── assets/imagenes/         # Logos, membretes e imágenes
│   └── data/                    # GeoJSON: urbanizaciones, lotes y áreas protegidas
├── scripts/
│   └── dev.mjs                  # Arranque conjunto de API y Vite
├── server/
│   ├── index.mjs                # API, autenticación y reglas de negocio
│   ├── config.mjs               # Configuración del almacenamiento
│   ├── postgres-store.mjs       # Persistencia PostgreSQL/PostGIS
│   └── data/                    # Datos JSON locales (no publicar)
├── src/
│   ├── components/
│   │   ├── Account/             # Mi cuenta
│   │   ├── Auth/                # Inicio de sesión
│   │   ├── Common/              # Componentes reutilizables
│   │   ├── Layout/              # Header, Sidebar y controles
│   │   ├── Map/                 # Geovisor, capas, fichas y edición de precios
│   │   ├── Modules/             # Resumen, CRUD, cotizaciones y reportes
│   │   ├── Reservations/        # Formularios, vencimientos y avisos
│   │   └── Tools/               # Herramientas de medición
│   ├── context/                 # Estado compartido de React
│   ├── hooks/                   # Lógica de Mapbox y capas
│   ├── services/                # Comunicación con API y GeoJSON
│   ├── styles/                  # Estilos de interfaz e impresión
│   ├── utils/                   # Funciones auxiliares y financieras
│   ├── App.jsx                  # Aplicación principal
│   └── main.jsx                 # Punto de entrada de React
├── .env.example                 # Ejemplo de token público Mapbox
├── INICIAR_GEOMAX.bat           # Inicio rápido en Windows
├── package.json                 # Dependencias y comandos npm
└── vite.config.js               # Configuración de Vite
```

## 5. Seguridad y respaldos

GeoMax está diseñado para acceso restringido. Los archivos `.env`, `server/.env` y `server/data/` no deben publicarse en GitHub. Los registros de compradores, reservas, operaciones y usuarios deben protegerse y respaldarse periódicamente.

**Proyecto:** GeoMax — MAX Inversiones · Sucre, Bolivia.