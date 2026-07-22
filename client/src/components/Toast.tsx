import { useEffect, useState } from 'react';
import {
  CheckCircle2,
  AlertCircle,
  Trash2,
  Sparkles,
  PencilLine,
  X,
  type LucideIcon,
} from 'lucide-react';

export type ToastKind = 'success' | 'error' | 'created' | 'updated' | 'deleted';

export interface ToastItem {
  id: string;
  kind: ToastKind;
  title: string;
  description?: string;
  duration?: number;
}

interface ToastStackProps {
  items: ToastItem[];
  onDismiss: (id: string) => void;
}

const META: Record<
  ToastKind,
  { icon: LucideIcon; className: string; defaultTitle: string }
> = {
  success: { icon: CheckCircle2, className: 'toast-success', defaultTitle: 'Sucesso' },
  error: { icon: AlertCircle, className: 'toast-error', defaultTitle: 'Erro' },
  created: { icon: Sparkles, className: 'toast-created', defaultTitle: 'Demanda criada' },
  updated: { icon: PencilLine, className: 'toast-updated', defaultTitle: 'Demanda atualizada' },
  deleted: { icon: Trash2, className: 'toast-deleted', defaultTitle: 'Demanda excluída' },
};

function ToastCard({ item, onDismiss }: { item: ToastItem; onDismiss: (id: string) => void }) {
  const [leaving, setLeaving] = useState(false);
  const duration = item.duration ?? 3800;
  const meta = META[item.kind];
  const Icon = meta.icon;

  useEffect(() => {
    const leaveAt = window.setTimeout(() => setLeaving(true), duration - 320);
    const removeAt = window.setTimeout(() => onDismiss(item.id), duration);
    return () => {
      window.clearTimeout(leaveAt);
      window.clearTimeout(removeAt);
    };
  }, [duration, item.id, onDismiss]);

  const dismiss = () => {
    setLeaving(true);
    window.setTimeout(() => onDismiss(item.id), 280);
  };

  return (
    <div
      className={`toast ${meta.className} ${leaving ? 'leaving' : ''}`}
      role="status"
      aria-live="polite"
    >
      <div className="toast-glow" />
      <div className="toast-icon-wrap">
        <Icon size={18} />
      </div>
      <div className="toast-body">
        <strong>{item.title || meta.defaultTitle}</strong>
        {item.description ? <p>{item.description}</p> : null}
      </div>
      <button type="button" className="toast-close" onClick={dismiss} aria-label="Fechar">
        <X size={14} />
      </button>
      <div className="toast-progress" style={{ animationDuration: `${duration}ms` }} />
    </div>
  );
}

export function ToastStack({ items, onDismiss }: ToastStackProps) {
  if (!items.length) return null;
  return (
    <div className="toasts" aria-label="Notificações">
      {items.map((t) => (
        <ToastCard key={t.id} item={t} onDismiss={onDismiss} />
      ))}
    </div>
  );
}
