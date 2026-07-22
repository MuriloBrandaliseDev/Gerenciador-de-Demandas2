import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown } from 'lucide-react';
import { isInsideFloating, useFloatingStyle } from '../hooks/useFloatingStyle';

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function Select({
  value,
  options,
  onChange,
  placeholder = 'Selecionar…',
  disabled,
}: SelectProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);
  const listId = useId();
  const selected = options.find((o) => o.value === value);
  const style = useFloatingStyle(open, triggerRef, { preferWidth: 'anchor', maxPanelHeight: 260 });

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const target = e.target as Node;
      if (rootRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      if (isInsideFloating(e.target)) return;
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

  return (
    <div className={`ui-select ${open ? 'open' : ''}`} ref={rootRef}>
      <button
        ref={triggerRef}
        type="button"
        className="ui-select-trigger"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((v) => !v)}
      >
        <span className={selected ? '' : 'placeholder'}>
          {selected?.label || placeholder}
        </span>
        <ChevronDown size={15} className="ui-select-caret" />
      </button>

      {open &&
        style &&
        createPortal(
          <ul
            ref={menuRef}
            className="ui-select-menu ui-floating"
            role="listbox"
            id={listId}
            data-ui-floating="true"
            style={{
              top: style.top,
              left: style.left,
              width: style.width,
              maxHeight: style.maxHeight,
            }}
          >
            {options.map((opt) => {
              const active = opt.value === value;
              return (
                <li key={opt.value} role="option" aria-selected={active}>
                  <button
                    type="button"
                    className={`ui-select-option ${active ? 'active' : ''}`}
                    onClick={() => {
                      onChange(opt.value);
                      setOpen(false);
                    }}
                  >
                    <span>{opt.label}</span>
                    {active && <Check size={14} />}
                  </button>
                </li>
              );
            })}
          </ul>,
          document.body
        )}
    </div>
  );
}
