import { useMapContext } from '../../context/MapContext'

const LAYERS = [
  { key: 'urbanizaciones', label: 'Urbanizaciones', color: '#1E3A8A' },
  { key: 'lotes', label: 'Lotes', color: '#10B981' },
  { key: 'puntos', label: 'Puntos de interés', color: '#3B82F6' }
]

export default function LayerController() {
  const { layerVisibility, setLayerVisibility } = useMapContext()

  const toggleLayer = key => {
    setLayerVisibility(previous => ({
      ...previous,
      [key]: !previous[key]
    }))
  }

  return (
    <section className="section-card">
      <h2 className="section-title">Capas</h2>

      {LAYERS.map(layer => {
        const isOn = layerVisibility[layer.key]

        return (
          <div className="layer-row" key={layer.key}>
            <div className="layer-label">
              <span
                className="swatch"
                style={{ background: layer.color }}
              />
              {layer.label}
            </div>

            <button
              className={`switch ${isOn ? 'on' : ''}`}
              onClick={() => toggleLayer(layer.key)}
              aria-pressed={isOn}
              aria-label={`${isOn ? 'Ocultar' : 'Mostrar'} ${layer.label}`}
            >
              <span />
            </button>
          </div>
        )
      })}
    </section>
  )
}
