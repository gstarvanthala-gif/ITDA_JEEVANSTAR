import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import AuthProvider from './context/AuthContext.jsx';
import { useAuth } from './hooks/useAuth';
import ProtectedRoute from './components/ProtectedRoute';
import RoleRoute from './components/RoleRoute';
import LoadingState from './components/LoadingState';
import DashboardLayout from './layouts/DashboardLayout';
import PublicLayout from './layouts/PublicLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdvisorDashboard from './pages/advisor/AdvisorDashboard';
import AdvisorClientsPage from './pages/advisor/AdvisorClientsPage';
import AdvisorClientDetailPage from './pages/advisor/AdvisorClientDetailPage';
import MessagesPage from './pages/MessagesPage';
import MarketPage from './pages/MarketPage';
import InvestorDashboard from './pages/investor/InvestorDashboard';
import GoalsPage from './pages/investor/GoalsPage';
import KycPage from './pages/investor/KycPage';
import AllocationPage from './pages/investor/AllocationPage';
import RiskAssessmentPage from './pages/investor/RiskAssessmentPage';
import TransactionsPage from './pages/investor/TransactionsPage';
import HomePage from './pages/public/HomePage';
import LoginPage from './pages/public/LoginPage';
import RegisterPage from './pages/public/RegisterPage';
import ProfilePage from './pages/ProfilePage';
import { getDefaultRoute } from './utils/roleUtils';
import './App.css';
import './workspace.css';

const PortfolioPage = lazy(() => import('./pages/investor/PortfolioPage.jsx'));

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingState label="Loading MicroGrow workspace" />;
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
          <Route path="/profile" element={<ProfilePage />} />
          <Route
            path="/investor"
            element={<RoleRoute allowedRoles={['investor']}><InvestorDashboard /></RoleRoute>}
          />
          <Route
            path="/investor/transactions"
            element={<RoleRoute allowedRoles={['investor']}><TransactionsPage /></RoleRoute>}
          />
          <Route
            path="/investor/risk"
            element={<RoleRoute allowedRoles={['investor']}><RiskAssessmentPage /></RoleRoute>}
          />
          <Route
            path="/investor/allocation"
            element={<RoleRoute allowedRoles={['investor']}><AllocationPage /></RoleRoute>}
          />
          <Route
            path="/investor/portfolio"
            element={(
              <RoleRoute allowedRoles={['investor']}>
                <Suspense fallback={<LoadingState label="Opening portfolio" />}>
                  <PortfolioPage />
                </Suspense>
              </RoleRoute>
            )}
          />
          <Route
            path="/investor/goals"
            element={<RoleRoute allowedRoles={['investor']}><GoalsPage /></RoleRoute>}
          />
          <Route
            path="/investor/kyc"
            element={<RoleRoute allowedRoles={['investor']}><KycPage /></RoleRoute>}
          />
          <Route
            path="/investor/market"
            element={<RoleRoute allowedRoles={['investor']}><MarketPage /></RoleRoute>}
          />

          <Route
            path="/advisor"
            element={<RoleRoute allowedRoles={['advisor']}><AdvisorDashboard /></RoleRoute>}
          />
          <Route
            path="/advisor/clients"
            element={<RoleRoute allowedRoles={['advisor']}><AdvisorClientsPage /></RoleRoute>}
          />
          <Route
            path="/advisor/clients/:id"
            element={<RoleRoute allowedRoles={['advisor']}><AdvisorClientDetailPage /></RoleRoute>}
          />
          <Route
            path="/advisor/messages"
            element={<RoleRoute allowedRoles={['advisor']}><MessagesPage /></RoleRoute>}
          />
          <Route
            path="/investor/messages"
            element={<RoleRoute allowedRoles={['investor']}><MessagesPage /></RoleRoute>}
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
          <Route
            path="/admin/advisors"
            element={<RoleRoute allowedRoles={['admin']}><AdminDashboard /></RoleRoute>}
          />
          <Route
            path="/admin/transactions"
            element={<RoleRoute allowedRoles={['admin']}><AdminDashboard /></RoleRoute>}
          />
          <Route
            path="/admin/notifications"
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
