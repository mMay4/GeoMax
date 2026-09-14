export default function ResponsiveDrawer({ open, onClose }) {
  if (!open) return null

  return (
    <button
      className="mobile-scrim"
      onClick={onClose}
      aria-label="Cerrar panel lateral"
    />
  )
}
