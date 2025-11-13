'use client'

import { useEffect, useRef } from 'react'

interface BaseModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  subtitle?: string | React.ReactElement
  children: React.ReactNode
  className?: string
  maxWidth?: string
}

export default function BaseModal({ 
  isOpen, 
  onClose, 
  title, 
  subtitle, 
  children, 
  className = '',
  maxWidth = '28rem'
}: BaseModalProps) {
  const modalRef = useRef<HTMLDivElement>(null)

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden' // Prevent background scrolling
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onClose])

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div 
      className="modal-overlay" 
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? "modal-title" : undefined}
    >
      <div 
        ref={modalRef}
        className={`modal-content ${className}`}
        style={{ maxWidth }}
      >
        {(title || subtitle) && (
          <div className="modal-header">
            {title && (
              <h2 id="modal-title" className="modal-title">
                {title}
              </h2>
            )}
            {subtitle && (
              <div className="modal-subtitle">
                {subtitle}
              </div>
            )}
          </div>
        )}
        {children}
      </div>
    </div>
  )
}
