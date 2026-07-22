import { useCallback, useEffect, useState } from 'react';
import { Menu, Plus, LayoutGrid } from 'lucide-react';
import { api } from './api';
import type { Demanda, DemandaInput, Filters, Status } from './types';
import { EMPTY_FILTERS } from './types';
import { Sidebar } from './components/Sidebar';
import { KanbanBoard } from './components/KanbanBoard';
import { DemandaModal } from './components/DemandaModal';
import { FiltersPopover } from './components/FiltersPopover';
import { ToastStack, type ToastItem, type ToastKind } from './components/Toast';
import './styles/index.css';

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

export default function App() {
  const [demandas, setDemandas] = useState<Demanda[]>([]);
  const [filters, setFilters] = useState<Filters>({ ...EMPTY_FILTERS });
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Demanda | null>(null);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (kind: ToastKind, title: string, description?: string) => {
      const id = uid();
      setToasts((prev) => [...prev, { id, kind, title, description, duration: 4000 }]);
    },
    []
  );

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.list(filters);
      setDemandas(data);
    } catch (err) {
      toast('error', 'Falha ao carregar', err instanceof Error ? err.message : undefined);
    } finally {
      setLoading(false);
    }
  }, [filters, toast]);

  useEffect(() => {
    const t = setTimeout(() => {
      void load();
    }, 180);
    return () => clearTimeout(t);
  }, [load]);

  const openNew = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (demanda: Demanda) => {
    setEditing(demanda);
    setModalOpen(true);
  };

  const handleSave = async (data: DemandaInput, id?: string) => {
    try {
      if (id) {
        const updated = await api.update(id, data);
        setDemandas((prev) => prev.map((d) => (d.id === id ? updated : d)));
        setEditing(updated);
        toast(
          'updated',
          'Demanda atualizada com sucesso',
          `"${updated.titulo}" foi salva no board.`
        );
        return updated;
      }
      const created = await api.create(data);
      setDemandas((prev) => [...prev, created]);
      setEditing(created);
      toast(
        'created',
        'Demanda criada com sucesso',
        `"${created.titulo}" salva. Agora você pode anexar arquivos.`
      );
      return created;
    } catch (err) {
      toast('error', 'Não foi possível salvar', err instanceof Error ? err.message : undefined);
      throw err;
    }
  };

  const handleDelete = async (id: string) => {
    const target = demandas.find((d) => d.id === id);
    try {
      await api.remove(id);
      setDemandas((prev) => prev.filter((d) => d.id !== id));
      toast(
        'deleted',
        'Demanda excluída com sucesso',
        target
          ? `"${target.titulo}" foi removida permanentemente.`
          : 'A demanda foi removida permanentemente.'
      );
    } catch (err) {
      toast('error', 'Não foi possível excluir', err instanceof Error ? err.message : undefined);
      throw err;
    }
  };

  const handleMovePersist = async (id: string, status: Status, ordem: number) => {
    try {
      const updated = await api.move(id, status, ordem);
      setDemandas((prev) => prev.map((d) => (d.id === id ? updated : d)));
    } catch (err) {
      toast('error', 'Erro ao mover demanda', err instanceof Error ? err.message : undefined);
      await load();
    }
  };

  return (
    <div className="app">
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onNew={openNew}
      />

      <div className="main">
        <header className="topbar">
          <div className="topbar-left">
            <button
              type="button"
              className="menu-btn"
              onClick={() => setSidebarOpen(true)}
              aria-label="Abrir menu"
            >
              <Menu size={18} />
            </button>
            <div>
              <h1>
                <LayoutGrid size={16} style={{ verticalAlign: 'middle', marginRight: 6 }} />
                Roadmap Kanban
              </h1>
              <div className="topbar-sub">
                {demandas.length} demanda{demandas.length === 1 ? '' : 's'} · arraste entre os status
              </div>
            </div>
          </div>

          <div className="topbar-actions">
            <FiltersPopover
              open={filtersOpen}
              onToggle={() => setFiltersOpen((v) => !v)}
              filters={filters}
              onChange={setFilters}
            />
            <button type="button" className="btn btn-primary" onClick={openNew}>
              <Plus size={15} />
              Nova
            </button>
          </div>
        </header>

        <div className="board-wrap">
          {loading ? (
            <div className="loading-state">
              <div className="spinner" />
              Carregando demandas…
            </div>
          ) : (
            <KanbanBoard
              demandas={demandas}
              onChangeLocal={setDemandas}
              onMovePersist={handleMovePersist}
              onOpen={openEdit}
            />
          )}
        </div>
      </div>

      <DemandaModal
        open={modalOpen}
        demanda={editing}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        onDelete={handleDelete}
        onAnexosChange={(id, count) => {
          setDemandas((prev) =>
            prev.map((d) => (d.id === id ? { ...d, anexosCount: count } : d))
          );
          setEditing((prev) => (prev?.id === id ? { ...prev, anexosCount: count } : prev));
        }}
      />

      <ToastStack items={toasts} onDismiss={dismissToast} />
    </div>
  );
}
