import { NavLink, Outlet, useNavigate } from 'react-router-dom';

import { useAuth } from '../hooks/useAuth';
import NotificationCenter from '../components/NotificationCenter';

const navMap = {
  investor: [
    { label: 'Overview', to: '/investor' },
    { label: 'Transactions', to: '/investor/transactions' },
    { label: 'Risk Assessment', to: '/investor/risk' },
    { label: 'Allocation', to: '/investor/allocation' },
    { label: 'Portfolio', to: '/investor/portfolio' },
    { label: 'Goals', to: '/investor/goals' },
    { label: 'Market', to: '/investor/market' },
    { label: 'Messages', to: '/investor/messages' },
  ],
  advisor: [
    { label: 'Overview', to: '/advisor' },
    { label: 'Clients', to: '/advisor/clients' },
    { label: 'Messages', to: '/advisor/messages' },
  ],
  admin: [
    { label: 'Dashboard', to: '/admin', end: true },
    { label: 'Users', to: '/admin/users' },
    { label: 'Advisors', to: '/admin/advisors' },
    { label: 'Transactions', to: '/admin/transactions' },
    { label: 'KYC Review', to: '/admin/kyc' },
    { label: 'Market Data', to: '/admin/market' },
    { label: 'Notifications', to: '/admin/notifications' },
  ],
};

function DashboardLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const menuItems = navMap[user?.role] || navMap.investor;

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="dashboard-shell">
      <a className="skip-link" href="#main-content">Skip to content</a>
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="brand-mark small" aria-hidden="true">M</div>
          <div>
            <p className="eyebrow">MicroGrow</p>
            <strong className="capitalize">{user?.role} workspace</strong>
          </div>
        </div>

        <nav className="sidebar-nav" aria-label="Dashboard navigation">
          {menuItems.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => (isActive ? 'active' : '')}>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <button type="button" className="logout-button" onClick={handleLogout}>
          Logout
        </button>
      </aside>

      <main className="dashboard-content" id="main-content" tabIndex="-1">
        <div className="dashboard-topbar">
          <NotificationCenter />
        </div>
        <Outlet />
      </main>
    </div>
  );
}

export default DashboardLayout;
