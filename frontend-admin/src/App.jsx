import { Routes, Route, Navigate } from 'react-router-dom';
import AdminLayout from './components/layout/AdminLayout';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/dashboard/Dashboard';
import UsersPage from './pages/users/UsersPage';
import VendorsPage from './pages/vendors/VendorsPage';
import CategoriesPage from './pages/categories/CategoriesPage';
import LeadsPage from './pages/leads/LeadsPage';
import ContactsPage from './pages/contacts/ContactsPage';
import LogsPage from './pages/logs/LogsPage';

const PrivateRoute = ({ children }) => localStorage.getItem('admin_token') ? children : <Navigate to="/login" replace />;
const GuestRoute = ({ children }) => !localStorage.getItem('admin_token') ? children : <Navigate to="/dashboard" replace />;

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<GuestRoute><LoginPage /></GuestRoute>} />
      <Route element={<PrivateRoute><AdminLayout /></PrivateRoute>}>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard"  element={<Dashboard />} />
        <Route path="/users"      element={<UsersPage />} />
        <Route path="/vendors"    element={<VendorsPage />} />
        <Route path="/categories" element={<CategoriesPage />} />
        <Route path="/leads"      element={<LeadsPage />} />
        <Route path="/contacts"   element={<ContactsPage />} />
        <Route path="/logs"       element={<LogsPage />} />
      </Route>
    </Routes>
  );
}
