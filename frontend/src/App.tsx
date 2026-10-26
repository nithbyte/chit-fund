import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppLayout } from './components/layout/AppLayout';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { CustomersPage } from './pages/CustomersPage';
import { CustomerDetailPage } from './pages/CustomerDetailPage';
import { CustomerFormPage } from './pages/CustomerFormPage';
import { ChitGroupsPage } from './pages/ChitGroupsPage';
import { ChitGroupDetailPage } from './pages/ChitGroupDetailPage';
import { ChitGroupSchedulePage } from './pages/ChitGroupSchedulePage';
import { CollectPage } from './pages/CollectPage';
import { ReceiptPage } from './pages/ReceiptPage';
import { PaymentRegisterPage } from './pages/PaymentRegisterPage';
import { ReconciliationPage } from './pages/ReconciliationPage';
import { ImportPage } from './pages/ImportPage';
import { SettingsPage } from './pages/SettingsPage';
import { AuctionsPage } from './pages/AuctionsPage';
import { PayoutsPage } from './pages/PayoutsPage';
import { ReportsPage } from './pages/ReportsPage';
import { ExpensesPage } from './pages/ExpensesPage';
import { AuditLogsPage } from './pages/AuditLogsPage';
import { MorePage } from './pages/MorePage';
import { LoadingSpinner } from './components/ui/LoadingSpinner';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <LoadingSpinner message="Checking secure session..." />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Login Route */}
            <Route path="/login" element={<LoginPage />} />

            {/* Protected Routes */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<DashboardPage />} />
              <Route path="customers" element={<CustomersPage />} />
              <Route path="customers/new" element={<CustomerFormPage />} />
              <Route path="customers/:id" element={<CustomerDetailPage />} />
              <Route path="customers/:id/edit" element={<CustomerFormPage />} />
              <Route path="chit-groups" element={<ChitGroupsPage />} />
              <Route path="chit-groups/:id" element={<ChitGroupDetailPage />} />
              <Route path="chit-groups/:id/schedule" element={<ChitGroupSchedulePage />} />
              <Route path="collect" element={<CollectPage />} />
              <Route path="receipts/:id" element={<ReceiptPage />} />
              <Route path="register" element={<PaymentRegisterPage />} />
              <Route path="reconciliation" element={<ReconciliationPage />} />
              <Route path="import" element={<ImportPage />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="auctions" element={<AuctionsPage />} />
              <Route path="payouts" element={<PayoutsPage />} />
              <Route path="expenses" element={<ExpensesPage />} />
              <Route path="reports" element={<ReportsPage />} />
              <Route path="audit-logs" element={<AuditLogsPage />} />
              <Route path="more" element={<MorePage />} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
