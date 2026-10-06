import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import RoleRoute from './components/RoleRoute';
import DashboardLayout from './layouts/DashboardLayout';
import PublicLayout from './layouts/PublicLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdvisorDashboard from './pages/advisor/AdvisorDashboard';
import InvestorDashboard from './pages/investor/InvestorDashboard';
import HomePage from './pages/public/HomePage';
import LoginPage from './pages/public/LoginPage';
import RegisterPage from './pages/public/RegisterPage';
import { getDefaultRoute } from './utils/roleUtils';
import './App.css';

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="page-shell centered">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={user ? <Navigate to={getDefaultRoute(user.role)} replace /> : <LoginPage />} />
        <Route path="/register" element={user ? <Navigate to={getDefaultRoute(user.role)} replace /> : <RegisterPage />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route element={<DashboardLayout />}>
          <Route
            path="/investor"
            element={<RoleRoute allowedRoles={['investor']}><InvestorDashboard /></RoleRoute>}
          />
          <Route
            path="/investor/transactions"
            element={<RoleRoute allowedRoles={['investor']}><InvestorDashboard /></RoleRoute>}
          />
          <Route
            path="/investor/portfolio"
            element={<RoleRoute allowedRoles={['investor']}><InvestorDashboard /></RoleRoute>}
          />
          <Route
            path="/investor/goals"
            element={<RoleRoute allowedRoles={['investor']}><InvestorDashboard /></RoleRoute>}
          />

          <Route
            path="/advisor"
            element={<RoleRoute allowedRoles={['advisor']}><AdvisorDashboard /></RoleRoute>}
          />
          <Route
            path="/advisor/clients"
            element={<RoleRoute allowedRoles={['advisor']}><AdvisorDashboard /></RoleRoute>}
          />
          <Route
            path="/advisor/messages"
            element={<RoleRoute allowedRoles={['advisor']}><AdvisorDashboard /></RoleRoute>}
          />

          <Route
            path="/admin"
            element={<RoleRoute allowedRoles={['admin']}><AdminDashboard /></RoleRoute>}
          />
          <Route
            path="/admin/users"
            element={<RoleRoute allowedRoles={['admin']}><AdminDashboard /></RoleRoute>}
          />
          <Route
            path="/admin/market"
            element={<RoleRoute allowedRoles={['admin']}><AdminDashboard /></RoleRoute>}
          />
          <Route
            path="/admin/kyc"
            element={<RoleRoute allowedRoles={['admin']}><AdminDashboard /></RoleRoute>}
          />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to={user ? getDefaultRoute(user.role) : '/'} replace />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
