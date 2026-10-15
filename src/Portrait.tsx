import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

// The portrait in the hero. Press it (or Enter) and the photo opens large in front of the page.
export default function Portrait({ src, alt, name }: { src: string; alt: string; name: string }) {
  const [open, setOpen] = useState(false)
  const closeRef = useRef<HTMLButtonElement>(null)
  const openerRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    closeRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    const html = document.documentElement
    const before = html.style.overflow
    html.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      html.style.overflow = before
      openerRef.current?.focus()
    }
  }, [open])

  return (
    <>
      <div className="portrait">
        <button
          ref={openerRef}
          type="button"
          className="portrait-btn"
          onClick={() => setOpen(true)}
          aria-label="View my photo larger"
        >
          <img className="avatar" src={src} alt={alt} width={120} height={150} />
        </button>
        <span className="scribble" aria-hidden="true">
          yes, a real person
        </span>
      </div>

      {open &&
        createPortal(
          <div className="photo-backdrop" data-overlay="photo" role="dialog" aria-modal="true" aria-label={`${name}, photo`} onClick={() => setOpen(false)}>
            <figure className="photo-frame" onClick={(e) => e.stopPropagation()}>
              <img src={src} alt={alt} />
              <figcaption>{name}</figcaption>
            </figure>
            <button ref={closeRef} type="button" className="photo-close" onClick={() => setOpen(false)} aria-label="Close photo">
              ×
            </button>
          </div>,
          document.body,
        )}
    </>
  )
}
