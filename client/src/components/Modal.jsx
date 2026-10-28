import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export function Modal({ isOpen, onClose, title, children, maxWidth = 'max-w-2xl' }) {
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape') onClose();
    }
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="modal show d-block"
      tabIndex="-1"
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 1060,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        overflowY: 'auto',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="modal-dialog modal-dialog-centered w-100"
        style={{
          maxWidth: maxWidth === 'max-w-lg' ? '540px' : maxWidth === 'max-w-xl' ? '640px' : maxWidth === 'max-w-2xl' ? '760px' : '600px',
          margin: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="modal-content ci-card border-0 shadow-lg"
          style={{
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            borderRadius: '12px',
            overflow: 'hidden',
          }}
        >
          <div
            className="modal-header d-flex align-items-center justify-content-between px-4 py-3 border-bottom"
            style={{ backgroundColor: '#f8fafc' }}
          >
            <h5 className="modal-title h6 fw-bold mb-0 text-dark">{title}</h5>
            <button
              type="button"
              className="btn-close"
              aria-label="Close"
              onClick={onClose}
              style={{ cursor: 'pointer' }}
            />
          </div>
          <div className="modal-body p-4" style={{ overflowY: 'auto' }}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
