import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CalendarDays, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useFloatingStyle } from '../hooks/useFloatingStyle';

interface DatePickerProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  allowClear?: boolean;
}

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MONTHS = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

function parseISO(iso: string): Date | null {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) return null;
  return date;
}

function toISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatBR(iso: string): string {
  const date = parseISO(iso);
  if (!date) return '';
  return date.toLocaleDateString('pt-BR');
}

function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function DatePicker({
  value,
  onChange,
  placeholder = 'Selecionar data',
  allowClear = false,
}: DatePickerProps) {
  const selected = parseISO(value);
  const [open, setOpen] = useState(false);
  const [view, setView] = useState(() => selected || new Date());
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const style = useFloatingStyle(open, triggerRef, {
    preferWidth: 'content',
    minWidth: 280,
    fitContent: true,
    contentHeight: 318,
  });

  useEffect(() => {
    if (!open) return;
    setView(parseISO(value) || new Date());
  }, [open, value]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const target = e.target as Node;
      if (rootRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const cells = useMemo(() => {
    const year = view.getFullYear();
    const month = view.getMonth();
    const first = new Date(year, month, 1);
    const startPad = first.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const prevDays = new Date(year, month, 0).getDate();
    const list: { date: Date; inMonth: boolean }[] = [];

    for (let i = startPad - 1; i >= 0; i--) {
      list.push({ date: new Date(year, month - 1, prevDays - i), inMonth: false });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      list.push({ date: new Date(year, month, d), inMonth: true });
    }
    while (list.length % 7 !== 0) {
      const next = list.length - (startPad + daysInMonth) + 1;
      list.push({ date: new Date(year, month + 1, next), inMonth: false });
    }
    return list;
  }, [view]);

  const today = new Date();

  return (
    <div className={`ui-date ${open ? 'open' : ''}`} ref={rootRef}>
      <button
        ref={triggerRef}
        type="button"
        className="ui-date-trigger"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <CalendarDays size={15} className="ui-date-icon" />
        <span className={selected ? '' : 'placeholder'}>
          {selected ? formatBR(value) : placeholder}
        </span>
        {allowClear && selected ? (
          <span
            className="ui-date-clear"
            role="button"
            tabIndex={0}
            aria-label="Limpar data"
            onClick={(e) => {
              e.stopPropagation();
              onChange('');
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                e.stopPropagation();
                onChange('');
              }
            }}
          >
            <X size={13} />
          </span>
        ) : null}
      </button>

      {open &&
        style &&
        createPortal(
          <div
            ref={panelRef}
            className="ui-date-panel ui-floating"
            role="dialog"
            data-ui-floating="true"
            style={{
              top: style.top,
              left: style.left,
              width: Math.max(style.width, 280),
            }}
          >
            <div className="ui-date-nav">
              <button
                type="button"
                className="ui-date-nav-btn"
                aria-label="Mês anterior"
                onClick={() => setView(new Date(view.getFullYear(), view.getMonth() - 1, 1))}
              >
                <ChevronLeft size={16} />
              </button>
              <div className="ui-date-month">
                {MONTHS[view.getMonth()]} {view.getFullYear()}
              </div>
              <button
                type="button"
                className="ui-date-nav-btn"
                aria-label="Próximo mês"
                onClick={() => setView(new Date(view.getFullYear(), view.getMonth() + 1, 1))}
              >
                <ChevronRight size={16} />
              </button>
            </div>

            <div className="ui-date-weekdays">
              {WEEKDAYS.map((d) => (
                <span key={d}>{d}</span>
              ))}
            </div>

            <div className="ui-date-grid">
              {cells.map(({ date, inMonth }) => {
                const iso = toISO(date);
                const isSelected = selected ? sameDay(date, selected) : false;
                const isToday = sameDay(date, today);
                return (
                  <button
                    key={iso + String(inMonth)}
                    type="button"
                    className={[
                      'ui-date-day',
                      inMonth ? '' : 'muted',
                      isSelected ? 'selected' : '',
                      isToday ? 'today' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    onClick={() => {
                      onChange(iso);
                      setOpen(false);
                    }}
                  >
                    {date.getDate()}
                  </button>
                );
              })}
            </div>

            <div className="ui-date-footer">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => {
                  onChange(toISO(new Date()));
                  setOpen(false);
                }}
              >
                Hoje
              </button>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
