import { useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowLeftRight,
  BarChart3,
  Bell,
  BriefcaseBusiness,
  ChevronRight,
  CircleDollarSign,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageCircle,
  Search,
  ShieldCheck,
  Sprout,
  Target,
  TrendingUp,
  X,
  Users,
  UserRound,
} from 'lucide-react';

import { useAuth } from '../hooks/useAuth';
import NotificationCenter from '../components/NotificationCenter';

const navMap = {
  investor: [
    { label: 'Dashboard', path: '/investor', to: '/investor', icon: LayoutDashboard },
    { label: 'Portfolio', path: '/investor/portfolio', to: '/investor/portfolio', icon: BriefcaseBusiness },
    { label: 'Transactions', path: '/investor/transactions', to: '/investor/transactions', icon: ArrowLeftRight },
    { label: 'Round-Ups', path: '/investor/transactions', hash: '#roundups', to: '/investor/transactions#roundups', icon: CircleDollarSign },
    { label: 'Goals', path: '/investor/goals', to: '/investor/goals', icon: Target },
    { label: 'Risk Profile', path: '/investor/risk', to: '/investor/risk', icon: ShieldCheck },
    { label: 'Allocation', path: '/investor/allocation', to: '/investor/allocation', icon: BarChart3 },
    { label: 'Market', path: '/investor/market', to: '/investor/market', icon: TrendingUp },
    { label: 'Advisor / Messages', path: '/investor/messages', to: '/investor/messages', icon: MessageCircle },
    { label: 'KYC', path: '/investor/kyc', to: '/investor/kyc', icon: ShieldCheck },
    { label: 'Profile', path: '/profile', to: '/profile', icon: UserRound },
  ],
  advisor: [
    { label: 'Dashboard', path: '/advisor', to: '/advisor', icon: LayoutDashboard },
    { label: 'Clients', path: '/advisor/clients', to: '/advisor/clients', icon: Users },
    { label: 'Messages', path: '/advisor/messages', to: '/advisor/messages', icon: MessageCircle },
    { label: 'Profile', path: '/profile', to: '/profile', icon: UserRound },
  ],
  admin: [
    { label: 'Dashboard', path: '/admin', to: '/admin', end: true, icon: LayoutDashboard },
    { label: 'Users', path: '/admin/users', to: '/admin/users', icon: Users },
    { label: 'Advisors', path: '/admin/advisors', to: '/admin/advisors', icon: BriefcaseBusiness },
    { label: 'Transactions', path: '/admin/transactions', to: '/admin/transactions', icon: ArrowLeftRight },
    { label: 'KYC Review', path: '/admin/kyc', to: '/admin/kyc', icon: ShieldCheck },
    { label: 'Market Data', path: '/admin/market', to: '/admin/market', icon: TrendingUp },
    { label: 'Notification Management', path: '/admin/notifications', to: '/admin/notifications', icon: Bell },
    { label: 'Profile', path: '/profile', to: '/profile', icon: UserRound },
  ],
};

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
};

function DashboardLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');

  const menuItems = navMap[user?.role] || navMap.investor;
  const activeMenuItem = menuItems.find((item) => (
    item.path === location.pathname && (item.hash ? item.hash === location.hash : !location.hash)
  )) || menuItems.find((item) => (
    !item.hash && item.path && location.pathname.startsWith(`${item.path}/`)
  )) || menuItems[0];

  const handleWorkspaceSearch = (event) => {
    event.preventDefault();
    const query = searchValue.trim().toLowerCase();
    const match = menuItems.find((item) => item.label.toLowerCase().includes(query));
    if (match && query) {
      navigate(match.to);
      setMobileNavOpen(false);
    }
  };

  const handleLogout = async () => {
    setMobileNavOpen(false);
    await logout();
    navigate('/login');
  };

  return (
    <div className={`dashboard-shell ${mobileNavOpen ? 'nav-open' : ''}`}>
      <a className="skip-link" href="#main-content">Skip to content</a>
      <aside className={`sidebar ${mobileNavOpen ? 'is-open' : ''}`} id="workspace-navigation">
        <div className="sidebar-header">
          <div className="brand-mark small" aria-hidden="true"><Sprout size={19} strokeWidth={2.2} /></div>
          <div className="sidebar-brand-copy">
            <strong>MicroGrow</strong>
            <span className="capitalize">{user?.role} workspace</span>
          </div>
          <span className="workspace-simulation-mark">DEMO</span>
        </div>

        <nav className="sidebar-nav" aria-label="Dashboard navigation">
          <span className="sidebar-section-label">Workspace</span>
          {menuItems.map((item) => {
            const isActive = item.hash
              ? location.pathname === item.path && location.hash === item.hash
              : location.pathname === item.path || Boolean(item.path && location.pathname.startsWith(`${item.path}/`));
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={isActive ? 'active' : ''}
                onClick={() => setMobileNavOpen(false)}
              >
                <item.icon className="nav-icon" size={18} strokeWidth={1.9} aria-hidden="true" />
                <span className="nav-link-label">{item.label}</span>
                {isActive && <ChevronRight className="nav-active-mark" size={15} aria-hidden="true" />}
              </NavLink>
            );
          })}
          <button
            className={`sidebar-notifications-link ${notificationsOpen ? 'active' : ''}`}
            type="button"
            onClick={() => {
              setNotificationsOpen(true);
              setMobileNavOpen(false);
            }}
          >
            <Bell className="nav-icon" size={18} strokeWidth={1.9} aria-hidden="true" />
            <span className="nav-link-label">Notifications</span>
          </button>
        </nav>

        <div className="sidebar-profile">
          <span className="sidebar-profile-avatar" aria-hidden="true">
            {(user?.name || user?.email || 'M').charAt(0).toUpperCase()}
          </span>
          <span className="sidebar-profile-copy">
            <strong>{user?.name || 'MicroGrow member'}</strong>
            <small>{user?.email || user?.role}</small>
          </span>
        </div>
        <button type="button" className="logout-button" onClick={handleLogout}>
          <LogOut size={17} aria-hidden="true" />
          <span>Logout</span>
        </button>
      </aside>
      {mobileNavOpen && (
        <button
          type="button"
          className="sidebar-backdrop"
          aria-label="Close navigation"
          onClick={() => setMobileNavOpen(false)}
        />
      )}

      <main className="dashboard-content" id="main-content" tabIndex="-1">
        <div className="dashboard-topbar">
          <div className="workspace-greeting">
            <span>{getGreeting()},</span>
            <strong>{user?.name || 'MicroGrow member'}</strong>
          </div>
          <div className="workspace-breadcrumb">
            <span>{user?.role} workspace</span>
            <span aria-hidden="true">/</span>
            <strong>{activeMenuItem.label}</strong>
          </div>
          <button
            type="button"
            className="mobile-menu-toggle"
            aria-label={mobileNavOpen ? 'Close navigation' : 'Open navigation'}
            aria-expanded={mobileNavOpen}
            aria-controls="workspace-navigation"
            onClick={() => setMobileNavOpen((open) => !open)}
          >
            {mobileNavOpen ? <X size={19} aria-hidden="true" /> : <Menu size={19} aria-hidden="true" />}
          </button>
          <span className="mobile-workspace-name">{user?.name || 'MicroGrow'}</span>
          <form className="workspace-search" role="search" onSubmit={handleWorkspaceSearch}>
            <Search size={17} aria-hidden="true" />
            <label className="sr-only" htmlFor="workspace-search-input">Search workspace sections</label>
            <input
              id="workspace-search-input"
              type="search"
              list="workspace-search-sections"
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
              placeholder="Search workspace"
            />
            <datalist id="workspace-search-sections">
              {menuItems.map((item) => <option key={item.to} value={item.label} />)}
            </datalist>
            <button type="submit" aria-label="Go to matching section"><ChevronRight size={16} aria-hidden="true" /></button>
          </form>
          <div className="dashboard-topbar-actions">
            <NavLink to="/profile" className="topbar-profile" aria-label="Open profile">
              <span className="topbar-profile-avatar" aria-hidden="true">
                {(user?.name || user?.email || 'M').charAt(0).toUpperCase()}
              </span>
              <span className="topbar-profile-copy">
                <strong>{user?.name || 'MicroGrow member'}</strong>
                <small><i className="account-status-dot" />{user?.isActive === false ? 'Inactive' : 'Account active'}</small>
              </span>
            </NavLink>
            <NotificationCenter open={notificationsOpen} onOpenChange={setNotificationsOpen} />
          </div>
        </div>
        <Outlet />
      </main>
    </div>
  );
}

export default DashboardLayout;
