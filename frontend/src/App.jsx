import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { ThemeProvider } from './context/ThemeContext';
import ProtectedRoute from './components/ProtectedRoute';
import RequireRole from './components/RequireRole';
import AppLayout from './components/layout/AppLayout';

import Login from './pages/Login';
import Register from './pages/Register';
import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';
import Monitors from './pages/Monitors';
import MonitorDetail from './pages/MonitorDetail';
import NetworkTools from './pages/NetworkTools';
import InvoicePrint from './pages/InvoicePrint';
import ErrorBoundary from './components/ErrorBoundary';
import Incidents from './pages/Incidents';
import StatusPages from './pages/StatusPages';
import PublicStatusPage from './pages/PublicStatusPage';
import Team from './pages/Team';
import AlertChannels from './pages/AlertChannels';
import Billing from './pages/Billing';
import Settings from './pages/Settings';
import AdminOrganizations from './pages/AdminOrganizations';
import AdminDashboard from './pages/AdminDashboard';
import AdminPlans from './pages/AdminPlans';
import AdminNodes from './pages/AdminNodes';
import AdminPaymentGateways from './pages/AdminPaymentGateways';
import AdminInvoices from './pages/AdminInvoices';
import AdminLogs from './pages/AdminLogs';
import AdminAlertIntegrations from './pages/AdminAlertIntegrations';
import AdminNotificationTemplates from './pages/AdminNotificationTemplates';
import AdminGlobalAlertChannels from './pages/AdminGlobalAlertChannels';
import AdminApiDocs from './pages/AdminApiDocs';
import AdminSettings from './pages/AdminSettings';
import AdminServerHealth from './pages/AdminServerHealth';
import ApiDocs from './pages/ApiDocs';
import NotFound from './pages/NotFound';

const TITLES = {
  '/dashboard': 'Dashboard',
  '/monitors': 'Monitors',
  '/incidents': 'Incidents',
  '/status-pages': 'Status Pages',
  '/team': 'Team Management',
  '/api-docs': 'API Documentation',
  '/alert-channels': 'Alert Channels',
  '/billing': 'Billing & Plans',
  '/settings': 'Settings',
  '/admin': 'Super Admin Dashboard',
  '/admin/organizations': 'Organizations',
  '/admin/plans': 'Plans',
  '/admin/nodes': 'Monitoring Nodes',
  '/admin/payment-gateways': 'Payment Gateways',
  '/admin/alert-integrations': 'Alert Integrations',
  '/admin/alert-channels': 'Global Alert Channels',
  '/admin/invoices': 'Invoices & Payments',
  '/admin/logs': 'Global Logs',
  '/admin/server-health': 'Server Health',
  '/admin/settings': 'Whitelabel Settings',
};

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <ToastProvider>
            <ErrorBoundary>
              <Routes>
                {/* Public routes */}
                <Route path="/" element={<Landing />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />

                {/* Public status page — no auth, no app shell */}
                <Route path="/status/:slug" element={<PublicStatusPage />} />

                {/* Authenticated app shell */}
                <Route
                  element={
                    <ProtectedRoute>
                      <AppLayoutWithTitle />
                    </ProtectedRoute>
                  }
                >
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/monitors" element={<Monitors />} />
                  <Route path="/monitors/:id" element={<MonitorDetail />} />
                  <Route path="/tools" element={<NetworkTools />} />
                  <Route path="/incidents" element={<Incidents />} />
                  <Route path="/status-pages" element={<StatusPages />} />
                  <Route path="/admin/alert-integrations" element={<AdminAlertIntegrations />} />
                  <Route path="/admin/notification-templates" element={<AdminNotificationTemplates />} />
                  <Route path="/admin/alert-channels" element={<AdminGlobalAlertChannels />} />
                  <Route path="/team" element={<Team />} />
                  <Route path="/alert-channels" element={<AlertChannels />} />
                  <Route path="/api-docs" element={<ApiDocs />} />
                  <Route path="/billing" element={<Billing />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route
                    path="/admin"
                    element={
                      <RequireRole role="super_admin">
                        <AdminDashboard />
                      </RequireRole>
                    }
                  />
                  <Route
                    path="/admin/organizations"
                    element={
                      <RequireRole role="super_admin">
                        <AdminOrganizations />
                      </RequireRole>
                    }
                  />
                  <Route
                    path="/admin/plans"
                    element={
                      <RequireRole role="super_admin">
                        <AdminPlans />
                      </RequireRole>
                    }
                  />
                  <Route
                    path="/admin/nodes"
                    element={
                      <RequireRole role="super_admin">
                        <AdminNodes />
                      </RequireRole>
                    }
                  />
                  <Route
                    path="/admin/payment-gateways"
                    element={
                      <RequireRole role="super_admin">
                        <AdminPaymentGateways />
                      </RequireRole>
                    }
                  />
                  <Route
                    path="/admin/invoices"
                    element={
                      <RequireRole role="super_admin">
                        <AdminInvoices />
                      </RequireRole>
                    }
                  />
                  <Route
                    path="/admin/logs"
                    element={
                      <RequireRole role="super_admin">
                        <AdminLogs />
                      </RequireRole>
                    }
                  />
                  <Route
                    path="/admin/alert-integrations"
                    element={
                      <RequireRole role="super_admin">
                        <AdminAlertIntegrations />
                      </RequireRole>
                    }
                  />
                  <Route
                    path="/admin/alert-channels"
                    element={
                      <RequireRole role="super_admin">
                        <AdminGlobalAlertChannels />
                      </RequireRole>
                    }
                  />
                  <Route
                    path="/admin/api-docs"
                    element={
                      <RequireRole role="super_admin">
                        <AdminApiDocs />
                      </RequireRole>
                    }
                  />
                  <Route
                    path="/admin/settings"
                    element={
                      <RequireRole role="super_admin">
                        <AdminSettings />
                      </RequireRole>
                    }
                  />
                  <Route
                    path="/admin/server-health"
                    element={
                      <RequireRole role="super_admin">
                        <AdminServerHealth />
                      </RequireRole>
                    }
                  />
                </Route>

                <Route path="*" element={<NotFound />} />
              </Routes>
            </ErrorBoundary>
          </ToastProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

import { useLocation } from 'react-router-dom';

/** Wraps AppLayout to resolve a page title from the current path. */
function AppLayoutWithTitle() {
  const location = useLocation();
  const path = location.pathname;
  const title = path.startsWith('/monitors/') ? 'Monitor Detail' : TITLES[path] || 'NetOps Monitor';
  return <AppLayout title={title} />;
}
