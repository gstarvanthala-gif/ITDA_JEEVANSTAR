import { NavLink, Outlet } from 'react-router-dom';

function PublicLayout() {
  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-wrap">
          <div className="brand-mark">M</div>
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

      <main className="page-shell">
        <Outlet />
      </main>
    </div>
  );
}

export default PublicLayout;
