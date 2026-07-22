import { useEffect, useRef } from 'react';
import { Filter, RotateCcw, Search, Check } from 'lucide-react';
import type { Filters, Status } from '../types';
import { EMPTY_FILTERS, STATUS_LABELS, STATUS_ORDER } from '../types';
import { DatePicker } from './DatePicker';
import { isInsideFloating } from '../hooks/useFloatingStyle';

interface FiltersPopoverProps {
  open: boolean;
  onToggle: () => void;
  filters: Filters;
  onChange: (filters: Filters) => void;
}

function countActive(filters: Filters): number {
  let n = 0;
  if (filters.q.trim()) n++;
  if (filters.status.length) n++;
  if (filters.dataDe) n++;
  if (filters.dataAte) n++;
  if (filters.horasMin !== '') n++;
  if (filters.horasMax !== '') n++;
  return n;
}

export function FiltersPopover({ open, onToggle, filters, onChange }: FiltersPopoverProps) {
  const ref = useRef<HTMLDivElement>(null);
  const active = countActive(filters);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (isInsideFloating(e.target)) return;
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onToggle();
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open, onToggle]);

  const toggleStatus = (status: Status) => {
    const has = filters.status.includes(status);
    onChange({
      ...filters,
      status: has ? filters.status.filter((s) => s !== status) : [...filters.status, status],
    });
  };

  return (
    <div className="filters-wrap" ref={ref}>
      <button
        type="button"
        className={`btn btn-ghost ${active ? 'active-filter' : ''}`}
        onClick={onToggle}
      >
        <Filter size={15} />
        Filtros
        {active > 0 && <span>({active})</span>}
      </button>

      {open && (
        <div className="filters-panel">
          <h3>
            <Filter size={14} />
            Filtrar demandas
          </h3>

          <div className="field">
            <label>
              <Search size={12} /> Busca
            </label>
            <input
              value={filters.q}
              onChange={(e) => onChange({ ...filters, q: e.target.value })}
              placeholder="Título ou descrição…"
            />
          </div>

          <div className="field filters-block">
            <label>Status</label>
            <div className="status-checks">
              {STATUS_ORDER.map((status) => {
                const on = filters.status.includes(status);
                return (
                  <button
                    key={status}
                    type="button"
                    className={`status-check ${on ? 'on' : ''}`}
                    onClick={() => toggleStatus(status)}
                  >
                    <span className="status-check-box">{on ? <Check size={11} /> : null}</span>
                    {STATUS_LABELS[status]}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="filters-grid">
            <div className="field">
              <label>Data de</label>
              <DatePicker
                value={filters.dataDe}
                onChange={(v) => onChange({ ...filters, dataDe: v })}
                placeholder="Início"
                allowClear
              />
            </div>
            <div className="field">
              <label>Data até</label>
              <DatePicker
                value={filters.dataAte}
                onChange={(v) => onChange({ ...filters, dataAte: v })}
                placeholder="Fim"
                allowClear
              />
            </div>
            <div className="field">
              <label>Horas mín.</label>
              <input
                type="number"
                min={0}
                step={0.5}
                value={filters.horasMin}
                onChange={(e) => onChange({ ...filters, horasMin: e.target.value })}
                placeholder="0"
              />
            </div>
            <div className="field">
              <label>Horas máx.</label>
              <input
                type="number"
                min={0}
                step={0.5}
                value={filters.horasMax}
                onChange={(e) => onChange({ ...filters, horasMax: e.target.value })}
                placeholder="—"
              />
            </div>
          </div>

          <div className="filters-actions">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => onChange({ ...EMPTY_FILTERS })}
            >
              <RotateCcw size={14} />
              Limpar
            </button>
            <button type="button" className="btn btn-primary" onClick={onToggle}>
              <Check size={14} />
              Aplicar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
