import { useEffect, useMemo, useState } from 'react';
import {
  FileBarChart2,
  FileSpreadsheet,
  FileText,
  Download,
  X,
  Filter,
  Layers,
} from 'lucide-react';
import type { Demanda, Filters } from '../types';
import { EMPTY_FILTERS } from '../types';
import { api } from '../api';
import { DatePicker } from './DatePicker';
import type { ToastKind } from './Toast';
import {
  REPORT_MODELS,
  buildReport,
  formatHoras,
  type ReportModelId,
} from '../lib/reportData';
import { exportExcel } from '../lib/exportExcel';
import { exportPdf } from '../lib/exportPdf';

interface ReportsModalProps {
  open: boolean;
  onClose: () => void;
  filters: Filters;
  demandasFiltradas: Demanda[];
  onToast: (kind: ToastKind, title: string, description?: string) => void;
}

export function ReportsModal({
  open,
  onClose,
  filters,
  demandasFiltradas,
  onToast,
}: ReportsModalProps) {
  const [model, setModel] = useState<ReportModelId>('completo');
  const [escopo, setEscopo] = useState<'filtradas' | 'todas'>('filtradas');
  const [periodoDe, setPeriodoDe] = useState('');
  const [periodoAte, setPeriodoAte] = useState('');
  const [todas, setTodas] = useState<Demanda[] | null>(null);
  const [loadingTodas, setLoadingTodas] = useState(false);
  const [exporting, setExporting] = useState<'pdf' | 'excel' | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open || escopo !== 'todas') return;
    let cancelled = false;
    setLoadingTodas(true);
    api
      .list({ ...EMPTY_FILTERS })
      .then((data) => {
        if (!cancelled) setTodas(data);
      })
      .catch((err) => {
        if (!cancelled) {
          onToast('error', 'Falha ao carregar demandas', err instanceof Error ? err.message : undefined);
          setEscopo('filtradas');
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingTodas(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, escopo, onToast]);

  const source = escopo === 'todas' ? todas ?? [] : demandasFiltradas;

  const preview = useMemo(
    () =>
      buildReport({
        demandas: source,
        model,
        filters,
        escopo,
        periodoDe,
        periodoAte,
      }),
    [source, model, filters, escopo, periodoDe, periodoAte]
  );

  if (!open) return null;

  const runExport = async (format: 'pdf' | 'excel') => {
    try {
      setExporting(format);
      const report = buildReport({
        demandas: source,
        model,
        filters,
        escopo,
        periodoDe,
        periodoAte,
      });
      if (report.summary.totalDemandas === 0) {
        onToast('error', 'Nada para exportar', 'Não há demandas no escopo selecionado.');
        return;
      }
      const result = format === 'pdf' ? exportPdf(report) : exportExcel(report);
      onToast(
        'created',
        format === 'pdf' ? 'PDF baixado' : 'Excel baixado',
        `${result.filename} · ${result.totalDemandas} demandas · ${result.totalHorasLabel}`
      );
    } catch (err) {
      onToast(
        'error',
        'Falha ao gerar relatório',
        err instanceof Error ? err.message : undefined
      );
    } finally {
      setExporting(null);
    }
  };

  const selectedMeta = REPORT_MODELS.find((m) => m.id === model)!;

  return (
    <div className="overlay" onClick={onClose}>
      <div
        className="modal reports-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal
      >
        <header className="modal-header">
          <h2>
            <FileBarChart2 size={16} />
            Relatórios
          </h2>
          <button type="button" className="btn btn-ghost" onClick={onClose} aria-label="Fechar">
            <X size={16} />
          </button>
        </header>

        <div className="modal-body">
          <p className="reports-intro">
            Escolha um modelo e baixe em PDF ou Excel com horas, status e resumos.
          </p>

          <div className="reports-models">
            {REPORT_MODELS.map((m) => (
              <button
                key={m.id}
                type="button"
                className={`report-model-card ${model === m.id ? 'active' : ''}`}
                onClick={() => setModel(m.id)}
              >
                <strong>{m.title}</strong>
                <span>{m.description}</span>
              </button>
            ))}
          </div>

          <div className="reports-options">
            <div className="field">
              <label>
                <Filter size={12} /> Escopo dos dados
              </label>
              <div className="reports-scope">
                <button
                  type="button"
                  className={`btn ${escopo === 'filtradas' ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => setEscopo('filtradas')}
                >
                  Filtros atuais
                </button>
                <button
                  type="button"
                  className={`btn ${escopo === 'todas' ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => setEscopo('todas')}
                  disabled={loadingTodas}
                >
                  <Layers size={14} />
                  {loadingTodas ? 'Carregando…' : 'Todas as demandas'}
                </button>
              </div>
            </div>

            <div className="grid-2">
              <div className="field">
                <label>Período de (opcional)</label>
                <DatePicker value={periodoDe} onChange={setPeriodoDe} />
              </div>
              <div className="field">
                <label>Período até (opcional)</label>
                <DatePicker value={periodoAte} onChange={setPeriodoAte} />
              </div>
            </div>
          </div>

          <div className="reports-preview">
            <div className="reports-preview-title">
              Prévia · {selectedMeta.title}
            </div>
            <div className="reports-stats">
              <div className="report-stat">
                <span>Demandas</span>
                <strong>{preview.summary.totalDemandas}</strong>
              </div>
              <div className="report-stat">
                <span>Horas totais</span>
                <strong>{formatHoras(preview.summary.totalHoras)}</strong>
              </div>
              <div className="report-stat">
                <span>Média</span>
                <strong>{formatHoras(preview.summary.mediaHoras)}</strong>
              </div>
              <div className="report-stat">
                <span>Com horas &gt; 0</span>
                <strong>
                  {preview.rows.filter((r) => r.horas > 0).length}
                </strong>
              </div>
            </div>
            <ul className="reports-filters-list">
              {preview.summary.filtrosTexto.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>
        </div>

        <footer className="modal-footer reports-footer">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Fechar
          </button>
          <div className="modal-footer-right">
            <button
              type="button"
              className="btn btn-ghost"
              disabled={!!exporting || loadingTodas}
              onClick={() => void runExport('excel')}
            >
              <FileSpreadsheet size={14} />
              {exporting === 'excel' ? 'Gerando…' : 'Baixar Excel'}
            </button>
            <button
              type="button"
              className="btn btn-primary"
              disabled={!!exporting || loadingTodas}
              onClick={() => void runExport('pdf')}
            >
              {exporting === 'pdf' ? (
                <>
                  <Download size={14} />
                  Gerando…
                </>
              ) : (
                <>
                  <FileText size={14} />
                  Baixar PDF
                </>
              )}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
