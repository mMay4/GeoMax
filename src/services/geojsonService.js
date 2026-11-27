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

  const coordinateParts = text.split(',').map(item => item.trim())
  const looksLikeCoordinates = coordinateParts.length === 2 &&
    coordinateParts.every(part => part !== '' && Number.isFinite(Number(part)))

  if (looksLikeCoordinates) {
    const [first, second] = coordinateParts.map(Number)
    const longitudeFirst = Math.abs(first) > 90 && Math.abs(second) <= 90
    const lat = longitudeFirst ? second : first
    const lng = longitudeFirst ? first : second

    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return []

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
