# GeoVisor React — MAX Inversiones

Proyecto frontend desarrollado con **Vite + React + Mapbox GL JS + CSS responsivo**.

## Alcance actual

La Fase 1 y Fase 2 están delimitadas exclusivamente a las **urbanizaciones y lotes de MAX Inversiones ubicados en Sucre, Bolivia**.

No se incluyen Yotala ni Santa Cruz en esta versión.

## Fase 1 implementada

- Arquitectura React organizada por componentes, contexto, hooks y servicios.
- Variables CSS con identidad corporativa.
- Header corporativo.
- Sidebar responsivo y colapsable.
- Mapa Mapbox centrado en Sucre.
- Zoom y geolocalización.
- Botón Home.
- Mapas base:
  - Callejero
  - Satelital
  - Oscuro
- Control de visibilidad de capas.
- Resize automático del mapa cuando cambia el tamaño del contenedor.

## Fase 2 implementada

- Carga dinámica de:
  - Urbanizaciones GeoJSON.
  - Lotes GeoJSON.
  - Puntos de interés GeoJSON.
- Estados de lotes:
  - Disponible.
  - Reservado.
  - Vendido.
- Estilos temáticos de capas.
- Resaltado del lote seleccionado.
- Popups con atributos.
- Clustering de puntos de interés.
- Buscador por dirección o coordenadas.
- Medición de distancia.
- Medición de área.
- Manejo de estado global mediante React Context.
- Optimizaciones de interacción para móviles.

## Importante sobre los datos

Los archivos GeoJSON incluidos son **datos ficticios de demostración** ubicados en Sucre.

Antes de la implementación final deben reemplazarse por los polígonos y datos oficiales proporcionados por MAX Inversiones.

## Instalación

### 1. Copiar la variable de entorno

Copia:

```bash
.env.example
```

como:

```bash
.env
```

y agrega el token público de Mapbox:

```env
VITE_MAPBOX_TOKEN=TU_TOKEN_PUBLICO_DE_MAPBOX
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Ejecutar en modo desarrollo

```bash
npm run dev
```

### 4. Generar versión de producción

```bash
npm run build
```

## Estructura

```text
GeoVisor-React/
├── public/
│   ├── assets/
│   │   └── icons/
│   └── data/
│       ├── urbanizaciones.geojson
│       ├── lotes.geojson
│       └── puntos-interes.geojson
├── src/
│   ├── components/
│   │   ├── Common/
│   │   ├── Layout/
│   │   ├── Map/
│   │   └── Tools/
│   ├── context/
│   ├── hooks/
│   ├── services/
│   ├── styles/
│   ├── App.jsx
│   └── main.jsx
├── .env.example
├── index.html
├── package.json
└── vite.config.js
```
