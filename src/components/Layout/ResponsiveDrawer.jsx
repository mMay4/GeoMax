export default function ResponsiveDrawer({ open }) {
  if (!open) return null

  return <div className="mobile-scrim" aria-hidden="true" />
}
