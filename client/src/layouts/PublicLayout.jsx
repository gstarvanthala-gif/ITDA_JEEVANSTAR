import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { Sprout } from 'lucide-react';

function PublicLayout() {
  const location = useLocation();
  const authVariant = location.pathname === '/login'
    ? 'login'
    : location.pathname === '/register' ? 'register' : '';
  const shellClasses = ['app-shell'];
  if (location.pathname === '/') shellClasses.push('landing-shell');
  if (authVariant) shellClasses.push('auth-shell', `${authVariant}-shell`);

  return (
    <div className={shellClasses.join(' ')}>
      <header className="topbar">
        <div className="brand-wrap">
          <div className="brand-mark" aria-hidden="true"><Sprout size={22} strokeWidth={2.1} /></div>
          <div>
            <p className="eyebrow">Micro-Investment Simulator</p>
            <h1>MicroGrow</h1>
          </div>
        </div>

        <nav className="topnav">
          <NavLink to="/">Home</NavLink>
          <NavLink to="/login">Login</NavLink>
          <NavLink to="/register">Register</NavLink>
        </nav>
      </header>

      <main className={`page-shell ${authVariant ? 'auth-page-shell' : ''}`}>
        <Outlet />
      </main>
    </div>
  );
}

export default PublicLayout;
