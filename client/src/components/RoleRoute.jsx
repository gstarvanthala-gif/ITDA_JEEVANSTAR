import { Navigate } from 'react-router-dom';

import { useAuth } from '../hooks/useAuth';

const getDefaultRoute = (role) => {
  if (role === 'advisor') return '/advisor';
  if (role === 'admin') return '/admin';
  return '/investor';
};

function RoleRoute({ allowedRoles, children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="page-shell centered">
        <div className="spinner" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(user.role)) {
    return <Navigate to={getDefaultRoute(user.role)} replace />;
  }

  return children;
}

export default RoleRoute;
