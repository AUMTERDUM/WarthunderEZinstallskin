import React, { useState } from 'react';

/**
 * Custom confirmation modal to replace native confirm()
 */
function ConfirmModal({ isOpen, title, message, onConfirm, onCancel, confirmText = 'ยืนยัน', cancelText = 'ยกเลิก', danger = false }) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onCancel} onKeyDown={(e) => e.key === 'Escape' && onCancel()} role="presentation">
      <div className="modal-content" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="modal-title">
        {title && <div className="modal-title" id="modal-title">{title}</div>}
        <div className="modal-message">{message}</div>
        <div className="modal-actions">
          <button className="modal-btn cancel" onClick={onCancel}>
            {cancelText}
          </button>
          <button className={`modal-btn ${danger ? 'danger' : 'confirm'}`} onClick={onConfirm}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Hook to use confirmation modal imperatively
 */
export function useConfirm() {
  const [state, setState] = useState({ isOpen: false, title: '', message: '', danger: false, resolve: null });

  const confirm = ({ title, message, danger = false, confirmText, cancelText }) => {
    return new Promise((resolve) => {
      setState({ isOpen: true, title, message, danger, confirmText, cancelText, resolve });
    });
  };

  const handleConfirm = () => {
    state.resolve?.(true);
    setState((s) => ({ ...s, isOpen: false }));
  };

  const handleCancel = () => {
    state.resolve?.(false);
    setState((s) => ({ ...s, isOpen: false }));
  };

  const modal = (
    <ConfirmModal
      isOpen={state.isOpen}
      title={state.title}
      message={state.message}
      danger={state.danger}
      confirmText={state.confirmText}
      cancelText={state.cancelText}
      onConfirm={handleConfirm}
      onCancel={handleCancel}
    />
  );

  return { confirm, ConfirmDialog: modal };
}

export default React.memo(ConfirmModal);
