import { useEffect, useState } from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  loading?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  danger = true,
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) setBusy(false);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy && !loading) onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, busy, loading, onCancel]);

  if (!open) return null;

  const handleConfirm = async () => {
    setBusy(true);
    try {
      await onConfirm();
    } finally {
      setBusy(false);
    }
  };

  const working = busy || loading;

  return (
    <div className="confirm-overlay" onClick={() => !working && onCancel()}>
      <div
        className="confirm-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-desc"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="confirm-close"
          onClick={onCancel}
          disabled={working}
          aria-label="Fechar"
        >
          <X size={16} />
        </button>

        <div className={`confirm-icon ${danger ? 'danger' : ''}`}>
          {danger ? <Trash2 size={22} /> : <AlertTriangle size={22} />}
          <span className="confirm-pulse" />
        </div>

        <h3 id="confirm-title">{title}</h3>
        <p id="confirm-desc">{description}</p>

        <div className="confirm-actions">
          <button type="button" className="btn btn-ghost" onClick={onCancel} disabled={working}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`}
            onClick={handleConfirm}
            disabled={working}
          >
            {danger ? <Trash2 size={14} /> : null}
            {working ? 'Excluindo…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
