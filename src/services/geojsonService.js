export async function loadGeoJSON(url) {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`No se pudo cargar el recurso GeoJSON: ${url}`)
  }
  return response.json()
}

export async function geocodeSucre(query, token) {
  const text = query.trim()
  if (!text) return []

  const maybeCoordinates = text.split(',').map(item => Number(item.trim()))
  if (maybeCoordinates.length === 2 && maybeCoordinates.every(Number.isFinite)) {
    let [first, second] = maybeCoordinates

    const lng = Math.abs(first) > 90 ? first : second
    const lat = Math.abs(first) > 90 ? second : first

    return [{
      id: 'typed-coordinates',
      place_name: `Coordenadas: ${lat.toFixed(6)}, ${lng.toFixed(6)}`,
      center: [lng, lat]
    }]
  }

  if (!token) return []

  const params = new URLSearchParams({
    access_token: token,
    autocomplete: 'true',
    limit: '5',
    country: 'bo',
    proximity: '-65.2627,-19.0476'
  })

  const url =
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(text)}.json?${params}`

  const response = await fetch(url)
  if (!response.ok) {
    throw new Error('No fue posible realizar la búsqueda geográfica.')
  }

  const data = await response.json()
  return data.features ?? []
}
