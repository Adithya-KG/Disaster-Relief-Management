import {
  AlertTriangle,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  PackageSearch,
  Tent,
  Truck,
  Users,
} from 'lucide-react';
import { isMockApi } from '../api/client';

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['dispatcher', 'camp_manager'] },
  { id: 'camps', label: 'Camps', icon: Tent, roles: ['dispatcher', 'camp_manager'] },
  { id: 'inventory', label: 'Inventory', icon: PackageSearch, roles: ['dispatcher', 'camp_manager'] },
  { id: 'volunteers', label: 'Volunteers', icon: Users, roles: ['dispatcher'] },
  { id: 'requests', label: 'Requests', icon: ClipboardList, roles: ['dispatcher', 'camp_manager'] },
];

export default function Shell({ user, activeScreen, onNavigate, onLogout, children }) {
  const visibleNav = navItems.filter((item) => item.roles.includes(user.role));

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-block">
          <div className="brand-mark">
            <Truck size={18} aria-hidden="true" />
          </div>
          <div>
            <strong>ReliefOps</strong>
            <span>{user.role === 'dispatcher' ? 'Dispatch Console' : 'Camp Console'}</span>
          </div>
        </div>

        <nav className="nav-list" aria-label="Primary">
          {visibleNav.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                className={activeScreen === item.id ? 'nav-item active' : 'nav-item'}
                onClick={() => onNavigate(item.id)}
                type="button"
              >
                <Icon size={17} aria-hidden="true" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          {isMockApi() ? (
            <div className="mock-flag">
              <AlertTriangle size={15} aria-hidden="true" />
              Mock API
            </div>
          ) : null}
          <button className="nav-item logout-button" onClick={onLogout} type="button">
            <LogOut size={17} aria-hidden="true" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      <main className="main-panel">
        <header className="topbar">
          <div>
            <p className="eyebrow">Operations</p>
            <h1>{visibleNav.find((item) => item.id === activeScreen)?.label || 'Dashboard'}</h1>
          </div>
          <div className="operator-pill">
            <span>{user.name}</span>
            <strong>{user.role === 'dispatcher' ? 'Dispatcher' : 'Camp Manager'}</strong>
          </div>
        </header>
        {children}
      </main>
    </div>
  );
}
