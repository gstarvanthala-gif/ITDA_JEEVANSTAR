import { NavLink, Outlet, useNavigate } from 'react-router-dom';

import { useAuth } from '../context/AuthContext';

const navMap = {
  investor: [
    { label: 'Overview', to: '/investor' },
    { label: 'Transactions', to: '/investor/transactions' },
    { label: 'Portfolio', to: '/investor/portfolio' },
    { label: 'Goals', to: '/investor/goals' },
  ],
  advisor: [
    { label: 'Overview', to: '/advisor' },
    { label: 'Clients', to: '/advisor/clients' },
    { label: 'Messages', to: '/advisor/messages' },
  ],
  admin: [
    { label: 'Overview', to: '/admin' },
    { label: 'Users', to: '/admin/users' },
    { label: 'Market Data', to: '/admin/market' },
    { label: 'KYC', to: '/admin/kyc' },
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
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="brand-mark small">M</div>
          <div>
            <p className="eyebrow">Role</p>
            <strong>{user?.role}</strong>
          </div>
        </div>

        <nav className="sidebar-nav">
          {menuItems.map((item) => (
            <NavLink key={item.to} to={item.to} className={({ isActive }) => (isActive ? 'active' : '')}>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <button type="button" className="logout-button" onClick={handleLogout}>
          Logout
        </button>
      </aside>

      <main className="dashboard-content">
        <Outlet />
      </main>
    </div>
  );
}

export default DashboardLayout;
