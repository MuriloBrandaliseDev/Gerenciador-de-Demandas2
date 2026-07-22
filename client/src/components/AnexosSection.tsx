import { useEffect, useRef, useState } from 'react';
import {
  Paperclip,
  Upload,
  FileText,
  Image as ImageIcon,
  ExternalLink,
  Trash2,
  Loader2,
} from 'lucide-react';
import type { Anexo } from '../types';
import { api } from '../api';

interface AnexosSectionProps {
  demandaId: string | null;
  onCountChange?: (count: number) => void;
}

function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function isImage(mime: string) {
  return mime.startsWith('image/');
}

export function AnexosSection({ demandaId, onCountChange }: AnexosSectionProps) {
  const [anexos, setAnexos] = useState<Anexo[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const load = async (id: string) => {
    setLoading(true);
    setError('');
    try {
      const list = await api.listAnexos(id);
      setAnexos(list);
      onCountChange?.(list.length);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar anexos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!demandaId) {
      setAnexos([]);
      return;
    }
    void load(demandaId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demandaId]);

  const uploadFiles = async (files: FileList | File[]) => {
    if (!demandaId) return;
    const list = Array.from(files).filter(
      (f) =>
        f.type.startsWith('image/') ||
        f.type === 'application/pdf'
    );
    if (!list.length) {
      setError('Envie apenas imagens (JPG, PNG, GIF, WEBP) ou PDF.');
      return;
    }
    setUploading(true);
    setError('');
    try {
      const created = await api.uploadAnexos(demandaId, list);
      setAnexos((prev) => {
        const next = [...prev, ...created];
        onCountChange?.(next.length);
        return next;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha no upload');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const remove = async (anexo: Anexo) => {
    if (!demandaId) return;
    if (!window.confirm(`Remover "${anexo.nomeOriginal}"?`)) return;
    try {
      await api.removeAnexo(demandaId, anexo.id);
      setAnexos((prev) => {
        const next = prev.filter((a) => a.id !== anexo.id);
        onCountChange?.(next.length);
        return next;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao remover');
    }
  };

  if (!demandaId) {
    return (
      <div className="anexos-box anexos-locked">
        <Paperclip size={16} />
        <div>
          <strong>Anexos</strong>
          <p>Salve a demanda primeiro para anexar imagens ou PDF.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="anexos-box">
      <div className="anexos-head">
        <label>
          <Paperclip size={12} /> Anexos
          {anexos.length > 0 && <span className="anexos-badge">{anexos.length}</span>}
        </label>
        <button
          type="button"
          className="btn btn-ghost"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? <Loader2 size={14} className="spin" /> : <Upload size={14} />}
          {uploading ? 'Enviando…' : 'Adicionar'}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp,application/pdf"
          multiple
          hidden
          onChange={(e) => {
            if (e.target.files?.length) void uploadFiles(e.target.files);
          }}
        />
      </div>

      <div
        className={`anexos-drop ${dragOver ? 'over' : ''}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (e.dataTransfer.files?.length) void uploadFiles(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
      >
        <Upload size={18} />
        <span>Arraste imagens ou PDF aqui, ou clique para escolher</span>
      </div>

      {error && <div className="anexos-error">{error}</div>}

      {loading ? (
        <div className="anexos-empty">Carregando anexos…</div>
      ) : anexos.length === 0 ? (
        <div className="anexos-empty">Nenhum anexo ainda.</div>
      ) : (
        <ul className="anexos-list">
          {anexos.map((anexo) => (
            <li key={anexo.id} className="anexo-item">
              <div className="anexo-icon">
                {isImage(anexo.mimeType) ? <ImageIcon size={16} /> : <FileText size={16} />}
              </div>
              <div className="anexo-info">
                <strong title={anexo.nomeOriginal}>{anexo.nomeOriginal}</strong>
                <span>
                  {isImage(anexo.mimeType) ? 'Imagem' : 'PDF'} · {formatBytes(anexo.tamanho)}
                </span>
              </div>
              <a
                className="btn btn-ghost"
                href={anexo.url}
                target="_blank"
                rel="noopener noreferrer"
                title="Abrir em nova aba"
                onClick={(e) => e.stopPropagation()}
              >
                <ExternalLink size={14} />
                Abrir
              </a>
              <button
                type="button"
                className="btn btn-ghost"
                title="Remover"
                onClick={() => void remove(anexo)}
              >
                <Trash2 size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
