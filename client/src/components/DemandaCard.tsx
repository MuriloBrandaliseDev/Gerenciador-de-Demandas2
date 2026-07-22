import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { CalendarDays, Clock3, GripVertical, Paperclip } from 'lucide-react';
import type { Demanda } from '../types';

interface DemandaCardProps {
  demanda: Demanda;
  onOpen: (demanda: Demanda) => void;
}

function formatDate(iso: string) {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

export function DemandaCard({ demanda, onOpen }: DemandaCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: demanda.id, data: { status: demanda.status } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <article
      ref={setNodeRef}
      style={style}
      className={`card ${isDragging ? 'dragging' : ''}`}
      onClick={() => onOpen(demanda)}
    >
      <div className="card-top">
        <span className="drag-handle" {...attributes} {...listeners} onClick={(e) => e.stopPropagation()}>
          <GripVertical size={14} />
        </span>
        <h3 className="card-title">{demanda.titulo}</h3>
      </div>
      <div className="card-meta">
        <span className="meta-chip">
          <Clock3 />
          {Number(demanda.horasTrabalhadas || 0).toLocaleString('pt-BR', {
            maximumFractionDigits: 1,
          })}
          h
        </span>
        <span className="meta-chip">
          <CalendarDays />
          {formatDate(demanda.dataReferencia)}
        </span>
        {(demanda.anexosCount ?? 0) > 0 && (
          <span className="meta-chip">
            <Paperclip />
            {demanda.anexosCount}
          </span>
        )}
      </div>
    </article>
  );
}
