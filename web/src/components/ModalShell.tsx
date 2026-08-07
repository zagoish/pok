import { useEffect, useRef, type ReactNode } from 'react'

interface ModalShellProps {
  open: boolean
  onClose: () => void
  labelledBy: string
  children: ReactNode
  className: string
  backdropClassName?: string
}

const FOCUSABLE_SELECTOR = [
  'button:not([disabled])',
  '[href]',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

function getFocusableElements(dialog: HTMLDivElement) {
  return Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (element) => !element.hidden && element.getAttribute('aria-hidden') !== 'true',
  )
}

export default function ModalShell({
  open,
  onClose,
  labelledBy,
  children,
  className,
  backdropClassName = 'modal-backdrop',
}: ModalShellProps) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const onCloseRef = useRef(onClose)
  const previousFocusedRef = useRef<HTMLElement | null>(null)
  onCloseRef.current = onClose

  useEffect(() => {
    if (!open) return undefined

    previousFocusedRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const dialog = dialogRef.current
    const focusableElements = dialog ? getFocusableElements(dialog) : []
    ;(focusableElements[0] ?? dialog)?.focus()

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onCloseRef.current()
        return
      }

      if (event.key !== 'Tab' || !dialog) return

      const currentFocusableElements = getFocusableElements(dialog)
      if (currentFocusableElements.length === 0) {
        event.preventDefault()
        dialog.focus()
        return
      }

      const first = currentFocusableElements[0]
      const last = currentFocusableElements[currentFocusableElements.length - 1]
      const activeElement = document.activeElement

      if (event.shiftKey && (activeElement === first || !dialog.contains(activeElement))) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && (activeElement === last || !dialog.contains(activeElement))) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      previousFocusedRef.current?.focus()
      previousFocusedRef.current = null
    }
  }, [open])

  if (!open) return null

  return (
    <div className={backdropClassName}>
      <div
        ref={dialogRef}
        className={className}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        tabIndex={-1}
      >
        {children}
      </div>
    </div>
  )
}
