import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/layout/Layout';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import Dashboard from './pages/Dashboard';
import EventsPage from './pages/events/EventsPage';
import EventDetailPage from './pages/events/EventDetailPage';
import VendorsPage from './pages/vendors/VendorsPage';
import VendorDetailPage from './pages/vendors/VendorDetailPage';
import ComparePage from './pages/vendors/ComparePage';
import FavoritesPage from './pages/vendors/FavoritesPage';
import ProfilePage from './pages/profile/ProfilePage';

const PrivateRoute = ({ children }) => localStorage.getItem('token') ? children : <Navigate to="/login" replace />;
const GuestRoute = ({ children }) => !localStorage.getItem('token') ? children : <Navigate to="/dashboard" replace />;

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/vendors" replace />} />
      <Route path="/login" element={<GuestRoute><Login /></GuestRoute>} />
      <Route path="/register" element={<GuestRoute><Register /></GuestRoute>} />
      <Route element={<Layout />}>
        <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
        <Route path="/events" element={<PrivateRoute><EventsPage /></PrivateRoute>} />
        <Route path="/events/:id" element={<PrivateRoute><EventDetailPage /></PrivateRoute>} />
        <Route path="/vendors" element={<VendorsPage />} />
        <Route path="/vendors/:id" element={<VendorDetailPage />} />
        <Route path="/compare" element={<ComparePage />} />
        <Route path="/favorites" element={<PrivateRoute><FavoritesPage /></PrivateRoute>} />
        <Route path="/profile" element={<PrivateRoute><ProfilePage /></PrivateRoute>} />
      </Route>
    </Routes>
  );
}
