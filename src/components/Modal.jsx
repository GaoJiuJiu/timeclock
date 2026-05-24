function Modal({ show, onClose, title, children }) {
  if (!show) return null

  const handleClose = (e) => {
    if (e.target.classList.contains('overlay')) onClose()
  }

  return (
    <div className="overlay show" onClick={handleClose}>
      <div className="modal">
        <div className="modal-header">
          <h2 className="modal-title">{title}</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        {children}
      </div>
    </div>
  )
}

export default Modal