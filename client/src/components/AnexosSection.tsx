import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import {
  Paperclip,
  Upload,
  FileText,
  Image as ImageIcon,
  ExternalLink,
  Trash2,
  Loader2,
  Clock3,
} from 'lucide-react';
import type { Anexo } from '../types';
import { api } from '../api';

export interface AnexosHandle {
  /** Envia arquivos pendentes para a demanda (após criar). */
  flushToDemanda: (demandaId: string) => Promise<number>;
  getPendingCount: () => number;
}

interface AnexosSectionProps {
  demandaId: string | null;
  onCountChange?: (count: number) => void;
}

interface PendingFile {
  key: string;
  file: File;
}

function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function isImage(mime: string) {
  return mime.startsWith('image/');
}

function isAllowed(file: File) {
  return file.type.startsWith('image/') || file.type === 'application/pdf';
}

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

export const AnexosSection = forwardRef<AnexosHandle, AnexosSectionProps>(
  function AnexosSection({ demandaId, onCountChange }, ref) {
    const [anexos, setAnexos] = useState<Anexo[]>([]);
    const [pending, setPending] = useState<PendingFile[]>([]);
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState('');
    const [dragOver, setDragOver] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const totalCount = anexos.length + pending.length;
    const onCountChangeRef = useRef(onCountChange);
    onCountChangeRef.current = onCountChange;

    useEffect(() => {
      onCountChangeRef.current?.(totalCount);
    }, [totalCount]);

    useEffect(() => {
      if (!demandaId) {
        setAnexos([]);
        return;
      }
      let cancelled = false;
      (async () => {
        setLoading(true);
        setError('');
        try {
          const list = await api.listAnexos(demandaId);
          if (!cancelled) setAnexos(list);
        } catch (err) {
          if (!cancelled) {
            setAnexos([]);
            setError(err instanceof Error ? err.message : 'Erro ao carregar anexos');
          }
        } finally {
          if (!cancelled) setLoading(false);
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [demandaId]);

    const addFiles = (files: FileList | File[]) => {
      const list = Array.from(files).filter(isAllowed);
      if (!list.length) {
        setError('Envie apenas imagens (JPG, PNG, GIF, WEBP) ou PDF.');
        return;
      }
      setError('');

      if (!demandaId) {
        setPending((prev) => [
          ...prev,
          ...list.map((file) => ({ key: uid(), file })),
        ]);
        if (inputRef.current) inputRef.current.value = '';
        return;
      }

      void uploadNow(demandaId, list);
    };

    const uploadNow = async (id: string, files: File[]) => {
      setUploading(true);
      setError('');
      try {
        const created = await api.uploadAnexos(id, files);
        setAnexos((prev) => [...prev, ...created]);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Falha no upload';
        if (msg.includes('404')) {
          setError(
            'Servidor desatualizado (upload 404). Na VM rode: bash scripts/update-from-git.sh'
          );
        } else {
          setError(msg);
        }
        throw err;
      } finally {
        setUploading(false);
        if (inputRef.current) inputRef.current.value = '';
      }
    };

    useImperativeHandle(ref, () => ({
      getPendingCount: () => pending.length,
      flushToDemanda: async (id: string) => {
        if (!pending.length) return 0;
        const files = pending.map((p) => p.file);
        setUploading(true);
        setError('');
        try {
          const created = await api.uploadAnexos(id, files);
          setAnexos((prev) => [...prev, ...created]);
          setPending([]);
          return created.length;
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Falha no upload dos anexos';
          if (msg.includes('404')) {
            setError(
              'Servidor desatualizado (upload 404). Na VM rode: bash scripts/update-from-git.sh'
            );
          } else {
            setError(msg);
          }
          throw err;
        } finally {
          setUploading(false);
        }
      },
    }));

    const removePending = (key: string) => {
      setPending((prev) => prev.filter((p) => p.key !== key));
    };

    const removeAnexo = async (anexo: Anexo) => {
      if (!demandaId) return;
      if (!window.confirm(`Remover "${anexo.nomeOriginal}"?`)) return;
      try {
        await api.removeAnexo(demandaId, anexo.id);
        setAnexos((prev) => prev.filter((a) => a.id !== anexo.id));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao remover');
      }
    };

    return (
      <div className="anexos-box">
        <div className="anexos-head">
          <label>
            <Paperclip size={12} /> Anexos
            {totalCount > 0 && <span className="anexos-badge">{totalCount}</span>}
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
              if (e.target.files?.length) addFiles(e.target.files);
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
            if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
          }}
          onClick={() => inputRef.current?.click()}
        >
          <Upload size={18} />
          <span>Arraste imagens ou PDF aqui, ou clique para escolher</span>
        </div>

        {!demandaId && pending.length > 0 && (
          <div className="anexos-hint">
            <Clock3 size={12} />
            Os arquivos serão enviados automaticamente ao salvar a demanda.
          </div>
        )}

        {error && <div className="anexos-error">{error}</div>}

        {loading ? (
          <div className="anexos-empty">Carregando anexos…</div>
        ) : totalCount === 0 ? (
          <div className="anexos-empty">Nenhum anexo ainda.</div>
        ) : (
          <ul className="anexos-list">
            {pending.map((item) => (
              <li key={item.key} className="anexo-item pending">
                <div className="anexo-icon">
                  {isImage(item.file.type) ? <ImageIcon size={16} /> : <FileText size={16} />}
                </div>
                <div className="anexo-info">
                  <strong title={item.file.name}>{item.file.name}</strong>
                  <span>
                    Aguardando salvar · {formatBytes(item.file.size)}
                  </span>
                </div>
                <button
                  type="button"
                  className="btn btn-ghost"
                  title="Remover"
                  onClick={() => removePending(item.key)}
                >
                  <Trash2 size={14} />
                </button>
              </li>
            ))}

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
                  onClick={() => void removeAnexo(anexo)}
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
);
