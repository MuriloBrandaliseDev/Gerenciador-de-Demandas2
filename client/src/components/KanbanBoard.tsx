import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { useMemo, useState } from 'react';
import type { Demanda, Status } from '../types';
import { STATUS_ORDER } from '../types';
import { KanbanColumn } from './KanbanColumn';
import { CalendarDays, Clock3, GripVertical } from 'lucide-react';

interface KanbanBoardProps {
  demandas: Demanda[];
  onChangeLocal: (next: Demanda[]) => void;
  onMovePersist: (id: string, status: Status, ordem: number) => Promise<void>;
  onOpen: (demanda: Demanda) => void;
}

function formatDate(iso: string) {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

function groupByStatus(demandas: Demanda[]): Record<Status, Demanda[]> {
  const map = Object.fromEntries(STATUS_ORDER.map((s) => [s, [] as Demanda[]])) as Record<
    Status,
    Demanda[]
  >;
  for (const d of demandas) {
    if (map[d.status]) map[d.status].push(d);
  }
  for (const s of STATUS_ORDER) {
    map[s].sort((a, b) => a.ordem - b.ordem);
  }
  return map;
}

function findContainer(demandas: Demanda[], id: string): Status | null {
  if (STATUS_ORDER.includes(id as Status)) return id as Status;
  const item = demandas.find((d) => d.id === id);
  return item?.status ?? null;
}

export function KanbanBoard({
  demandas,
  onChangeLocal,
  onMovePersist,
  onOpen,
}: KanbanBoardProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  const grouped = useMemo(() => groupByStatus(demandas), [demandas]);
  const active = demandas.find((d) => d.id === activeId) || null;

  const onDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  };

  const onDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeItemId = String(active.id);
    const overId = String(over.id);

    const activeContainer = findContainer(demandas, activeItemId);
    const overContainer = findContainer(demandas, overId);
    if (!activeContainer || !overContainer || activeContainer === overContainer) return;

    const activeItems = grouped[activeContainer];
    const overItems = grouped[overContainer];
    const activeIndex = activeItems.findIndex((i) => i.id === activeItemId);
    const overIndex = STATUS_ORDER.includes(overId as Status)
      ? overItems.length
      : overItems.findIndex((i) => i.id === overId);

    if (activeIndex < 0) return;

    const moving = { ...activeItems[activeIndex], status: overContainer };
    const nextOver = [...overItems];
    nextOver.splice(overIndex >= 0 ? overIndex : nextOver.length, 0, moving);

    const next: Demanda[] = [];
    for (const status of STATUS_ORDER) {
      const list =
        status === activeContainer
          ? activeItems.filter((i) => i.id !== activeItemId)
          : status === overContainer
            ? nextOver
            : grouped[status];
      list.forEach((item, ordem) => {
        next.push({ ...item, status, ordem });
      });
    }
    onChangeLocal(next);
  };

  const onDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over) return;

    const activeItemId = String(active.id);
    const overId = String(over.id);
    const activeContainer = findContainer(demandas, activeItemId);
    const overContainer = findContainer(demandas, overId);
    if (!activeContainer || !overContainer) return;

    const items = groupByStatus(demandas)[overContainer];
    const oldIndex = items.findIndex((i) => i.id === activeItemId);
    let newIndex = STATUS_ORDER.includes(overId as Status)
      ? items.length - 1
      : items.findIndex((i) => i.id === overId);

    if (oldIndex < 0 || newIndex < 0) return;

    let nextList = items;
    if (oldIndex !== newIndex) {
      nextList = arrayMove(items, oldIndex, newIndex);
    }

    const next: Demanda[] = [];
    for (const status of STATUS_ORDER) {
      const list = status === overContainer ? nextList : groupByStatus(demandas)[status];
      list.forEach((item, ordem) => {
        next.push({ ...item, status, ordem });
      });
    }
    onChangeLocal(next);

    const moved = next.find((d) => d.id === activeItemId);
    if (moved) {
      await onMovePersist(moved.id, moved.status, moved.ordem);
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
    >
      <div className="board">
        {STATUS_ORDER.map((status) => (
          <KanbanColumn
            key={status}
            status={status}
            items={grouped[status]}
            onOpen={onOpen}
          />
        ))}
      </div>

      <DragOverlay>
        {active ? (
          <article className="card" style={{ boxShadow: 'var(--shadow)', cursor: 'grabbing' }}>
            <div className="card-top">
              <span className="drag-handle">
                <GripVertical size={14} />
              </span>
              <h3 className="card-title">{active.titulo}</h3>
            </div>
            <div className="card-meta">
              <span className="meta-chip">
                <Clock3 />
                {Number(active.horasTrabalhadas || 0).toLocaleString('pt-BR', {
                  maximumFractionDigits: 1,
                })}
                h
              </span>
              <span className="meta-chip">
                <CalendarDays />
                {formatDate(active.dataReferencia)}
              </span>
            </div>
          </article>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
