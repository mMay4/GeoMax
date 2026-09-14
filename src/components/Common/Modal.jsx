export default function Modal({ open, title, children, onClose }) {
  if (!open) return null

  return (
    <div
      role="presentation"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        display: 'grid',
        placeItems: 'center',
        background: 'rgba(17,24,39,.45)',
        padding: 16
      }}
      onClick={onClose}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={event => event.stopPropagation()}
        style={{
          width: 'min(520px, 100%)',
          background: 'white',
          borderRadius: 16,
          padding: 18,
          boxShadow: 'var(--shadow-md)'
        }}
      >
        <h2 style={{ marginTop: 0, color: 'var(--brand-primary)' }}>
          {title}
        </h2>
        {children}
      </section>
    </div>
  )
}
