import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from './store/authStore';
import AppLayout from './components/Layout/AppLayout';
import LoginPage from './pages/Auth/Login';
import RegisterPage from './pages/Auth/Register';
import DashboardPage from './pages/Dashboard';
import TimeTrackerPage from './pages/TimeTracker';
import ExpensesPage from './pages/Expenses';
import JobsPage from './pages/Jobs';
import SalesPage from './pages/Sales';
import EmployeesPage from './pages/Employees';
import PayrollPage from './pages/Payroll';
import RequireRole from './components/RequireRole';
import RequireAdmin from './components/RequireAdmin';
import BackupsPage from './pages/Admin/Backups';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
});

function AuthInitializer({ children }: { children: React.ReactNode }) {
  const initialize = useAuthStore((s) => s.initialize);

  useEffect(() => {
    void initialize();
  }, [initialize]);

  return <>{children}</>;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '')}>
        <AuthInitializer>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route element={<AppLayout />}>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/tracker" element={<TimeTrackerPage />} />
              <Route
                path="/expenses"
                element={<RequireRole role="hours_expenses"><ExpensesPage /></RequireRole>}
              />
              <Route
                path="/sales"
                element={<RequireRole role="hours_expenses_sales"><SalesPage /></RequireRole>}
              />
              <Route path="/jobs" element={<RequireRole role="owner"><JobsPage /></RequireRole>} />
              <Route
                path="/employees"
                element={<RequireRole role="owner"><EmployeesPage /></RequireRole>}
              />
              <Route
                path="/payroll"
                element={<RequireRole role="owner"><PayrollPage /></RequireRole>}
              />
              <Route
                path="/admin/backups"
                element={<RequireAdmin><BackupsPage /></RequireAdmin>}
              />
            </Route>
          </Routes>
        </AuthInitializer>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
