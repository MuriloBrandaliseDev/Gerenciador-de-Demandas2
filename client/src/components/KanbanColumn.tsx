import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Inbox } from 'lucide-react';
import type { Demanda, Status } from '../types';
import { STATUS_LABELS } from '../types';
import { DemandaCard } from './DemandaCard';

interface KanbanColumnProps {
  status: Status;
  items: Demanda[];
  onOpen: (demanda: Demanda) => void;
}

const DOT_COLORS: Record<Status, string> = {
  novo: '#60a5fa',
  aprovado: '#38bdf8',
  em_andamento: '#3b82f6',
  em_testes: '#818cf8',
  finalizado: '#22c55e',
};

export function KanbanColumn({ status, items, onOpen }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <section className={`column ${isOver ? 'over' : ''}`}>
      <header className="column-header">
        <div className="column-title">
          <span className="column-dot" style={{ background: DOT_COLORS[status] }} />
          {STATUS_LABELS[status]}
        </div>
        <span className="column-count">{items.length}</span>
      </header>

      <div className="column-body" ref={setNodeRef}>
        <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
          {items.length === 0 ? (
            <div className="empty-column">
              <Inbox size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />
              Arraste para cá
            </div>
          ) : (
            items.map((demanda) => (
              <DemandaCard key={demanda.id} demanda={demanda} onOpen={onOpen} />
            ))
          )}
        </SortableContext>
      </div>
    </section>
  );
}
