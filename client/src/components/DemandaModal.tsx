import { useEffect, useRef, useState } from 'react';
import {
  X,
  Save,
  Trash2,
  FilePenLine,
  Clock3,
  CalendarDays,
  Flag,
  Type,
} from 'lucide-react';
import type { Demanda, DemandaInput, Status } from '../types';
import { STATUS_LABELS, STATUS_ORDER } from '../types';
import { RichEditor } from './RichEditor';
import { Select } from './Select';
import { DatePicker } from './DatePicker';
import { ConfirmDialog } from './ConfirmDialog';
import { AnexosSection, type AnexosHandle } from './AnexosSection';

const STATUS_OPTIONS = STATUS_ORDER.map((s) => ({
  value: s,
  label: STATUS_LABELS[s],
}));

interface DemandaModalProps {
  open: boolean;
  demanda: Demanda | null;
  onClose: () => void;
  onSave: (data: DemandaInput, id?: string) => Promise<Demanda | void>;
  onDelete?: (id: string) => Promise<void>;
  onAnexosChange?: (demandaId: string, count: number) => void;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

export function DemandaModal({
  open,
  demanda,
  onClose,
  onSave,
  onDelete,
  onAnexosChange,
}: DemandaModalProps) {
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [status, setStatus] = useState<Status>('novo');
  const [horas, setHoras] = useState('0');
  const [data, setData] = useState(today());
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const anexosRef = useRef<AnexosHandle>(null);

  useEffect(() => {
    if (!open) {
      setConfirmDelete(false);
      return;
    }
    if (demanda) {
      setTitulo(demanda.titulo);
      setDescricao(demanda.descricao || '');
      setStatus(demanda.status);
      setHoras(String(demanda.horasTrabalhadas ?? 0));
      setData(demanda.dataReferencia || today());
    } else {
      setTitulo('');
      setDescricao('');
      setStatus('novo');
      setHoras('0');
      setData(today());
    }
  }, [open, demanda]);

  useEffect(() => {
    if (!open || confirmDelete) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose, confirmDelete]);

  if (!open) return null;

  const handleSave = async () => {
    if (!titulo.trim()) return;
    setSaving(true);
    try {
      const saved = await onSave(
        {
          titulo: titulo.trim(),
          descricao,
          status,
          horasTrabalhadas: Number(horas) || 0,
          dataReferencia: data,
        },
        demanda?.id
      );
      const id = demanda?.id || saved?.id;
      if (id && anexosRef.current && anexosRef.current.getPendingCount() > 0) {
        await anexosRef.current.flushToDemanda(id);
      }
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!demanda || !onDelete) return;
    setSaving(true);
    try {
      await onDelete(demanda.id);
      setConfirmDelete(false);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="overlay" onClick={() => !confirmDelete && onClose()}>
        <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal>
          <header className="modal-header">
            <h2>
              <FilePenLine size={16} />
              {demanda ? 'Editar demanda' : 'Nova demanda'}
            </h2>
            <button type="button" className="btn btn-ghost" onClick={onClose} aria-label="Fechar">
              <X size={16} />
            </button>
          </header>

          <div className="modal-body">
            <div className="field">
              <label>
                <Type size={12} /> Título
              </label>
              <input
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                placeholder="Nome da demanda"
                autoFocus
              />
            </div>

            <div className="field">
              <label>Descrição</label>
              <RichEditor value={descricao} onChange={setDescricao} />
            </div>

            <div className="grid-3">
              <div className="field">
                <label>
                  <Flag size={12} /> Status
                </label>
                <Select
                  value={status}
                  options={STATUS_OPTIONS}
                  onChange={(v) => setStatus(v as Status)}
                />
              </div>
              <div className="field">
                <label>
                  <Clock3 size={12} /> Horas trabalhadas
                </label>
                <input
                  type="number"
                  min={0}
                  step={0.5}
                  value={horas}
                  onChange={(e) => setHoras(e.target.value)}
                />
              </div>
            <div className="field">
              <label>
                <CalendarDays size={12} /> Data
              </label>
              <DatePicker value={data} onChange={setData} />
            </div>
          </div>

          <AnexosSection
            ref={anexosRef}
            demandaId={demanda?.id ?? null}
            onCountChange={(count) => {
              if (demanda?.id) onAnexosChange?.(demanda.id, count);
            }}
          />
        </div>

          <footer className="modal-footer">
            {demanda ? (
              <button
                type="button"
                className="btn btn-danger"
                onClick={() => setConfirmDelete(true)}
                disabled={saving}
              >
                <Trash2 size={14} />
                Excluir
              </button>
            ) : (
              <span />
            )}
            <div className="modal-footer-right">
              <button type="button" className="btn btn-ghost" onClick={onClose} disabled={saving}>
                Cancelar
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSave}
                disabled={saving || !titulo.trim()}
              >
                <Save size={14} />
                {saving ? 'Salvando…' : 'Salvar'}
              </button>
            </div>
          </footer>
        </div>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title="Excluir demanda?"
        description={`Tem certeza que deseja excluir "${demanda?.titulo || 'esta demanda'}"? Essa ação não pode ser desfeita.`}
        confirmLabel="Sim, excluir"
        cancelLabel="Manter demanda"
        danger
        loading={saving}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={handleDeleteConfirm}
      />
    </>
  );
}
