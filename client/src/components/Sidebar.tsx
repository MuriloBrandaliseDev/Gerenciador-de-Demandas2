import {
  LayoutDashboard,
  Plus,
  PanelLeft,
  Server,
} from 'lucide-react';

interface SidebarProps {
  open: boolean;
  onClose: () => void;
  onNew: () => void;
}

export function Sidebar({ open, onClose, onNew }: SidebarProps) {
  return (
    <>
      {open && <div className="sidebar-backdrop" onClick={onClose} />}
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <div className="brand">
          <div className="brand-mark">
            <LayoutDashboard size={18} />
          </div>
          <div className="brand-text">
            <strong>Demandas</strong>
            <span>Kanban local</span>
          </div>
        </div>

        <button type="button" className="nav-item active">
          <PanelLeft />
          Board
        </button>

        <button
          type="button"
          className="nav-item"
          onClick={() => {
            onNew();
            onClose();
          }}
        >
          <Plus />
          Nova demanda
        </button>

        <div className="sidebar-footer">
          <Server size={12} />
          Sem login · dados locais
        </div>
      </aside>
    </>
  );
}
