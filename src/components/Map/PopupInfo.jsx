export default function PopupInfo({ properties }) {
  if (!properties) return null

  const status = properties.estado

  return (
    <div className="popup-card">
      <h3>
        {properties.nombre || properties.codigo || 'Información'}
      </h3>

      {status && (
        <span className={`status-badge status-${status}`}>
          {status.toUpperCase()}
        </span>
      )}

      <table className="popup-table">
        <tbody>
          {Object.entries(properties)
            .filter(([key]) => key !== 'nombre')
            .map(([key, value]) => (
              <tr key={key}>
                <td>{key.replaceAll('_', ' ')}</td>
                <td>{String(value)}</td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  )
}
