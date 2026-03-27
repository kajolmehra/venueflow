export function AppModal({ children, onClose, size = 'default', title }) {
  return (
    <div aria-modal="true" className="app-modal-overlay" onClick={onClose} role="dialog">
      <div className={`app-modal-card${size === 'wide' ? ' is-wide' : ''}`} onClick={(event) => event.stopPropagation()}>
        <div className="app-modal-head">
          <h3>{title}</h3>
          <button aria-label="Close modal" className="app-modal-close" onClick={onClose} type="button">
            <span />
            <span />
          </button>
        </div>
        <div className="app-modal-body">{children}</div>
      </div>
    </div>
  )
}
