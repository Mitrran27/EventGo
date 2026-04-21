import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Menu, X, LogOut } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import logo from '../../assets/logo.png';  // ← go up TWO levels

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const handleLogout = () => { logout(); navigate('/login'); };
  const active = (p) => pathname.startsWith(p) ? 'text-brand-500 font-semibold' : 'text-gray-600 hover:text-gray-900';

  return (
    <nav className="sticky top-0 z-50 bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <img src={logo} alt="EventGo" className="h-14 w-auto mx-auto tracking-tight"/>
          {/* <Link to="/vendors" className="text-brand-500 font-bold text-2xl tracking-tight">event<span className="text-gray-900">go</span></Link> */}
          <div className="hidden md:flex items-center gap-6">
            <Link to="/vendors" className={`text-sm ${active('/vendors')}`}>Explore</Link>
            {user && <>
              <Link to="/dashboard" className={`text-sm ${active('/dashboard')}`}>Dashboard</Link>
              <Link to="/events" className={`text-sm ${active('/events')}`}>My Events</Link>
              <Link to="/favorites" className={`text-sm ${active('/favorites')}`}>Favourites</Link>
            </>}
          </div>
          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-3">
                <Link to="/profile" className="w-8 h-8 rounded-full bg-brand-500 text-white flex items-center justify-center text-xs font-bold">{user.name?.[0]?.toUpperCase()}</Link>
                <button onClick={handleLogout} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"><LogOut size={15} /> Log out</button>
              </div>
            ) : (
              <>
                <Link to="/login" className="text-sm font-semibold text-gray-700 hover:text-gray-900 px-4 py-2">Log in</Link>
                <Link to="/register" className="btn-primary text-sm py-2 px-5">Sign up</Link>
              </>
            )}
          </div>
          <button className="md:hidden p-2" onClick={() => setOpen(!open)}>{open ? <X size={22} /> : <Menu size={22} />}</button>
        </div>
      </div>
      {open && (
        <div className="md:hidden border-t border-gray-100 bg-white px-4 py-4 flex flex-col gap-4">
          <Link to="/vendors" className="text-sm font-medium" onClick={() => setOpen(false)}>Explore</Link>
          {user && <>
            <Link to="/dashboard" className="text-sm font-medium" onClick={() => setOpen(false)}>Dashboard</Link>
            <Link to="/events" className="text-sm font-medium" onClick={() => setOpen(false)}>My Events</Link>
            <Link to="/favorites" className="text-sm font-medium" onClick={() => setOpen(false)}>Favourites</Link>
            <Link to="/profile" className="text-sm font-medium" onClick={() => setOpen(false)}>Profile</Link>
            <button onClick={handleLogout} className="text-sm text-left text-red-500">Log out</button>
          </>}
          {!user && <>
            <Link to="/login" className="text-sm font-medium" onClick={() => setOpen(false)}>Log in</Link>
            <Link to="/register" className="btn-primary text-sm text-center" onClick={() => setOpen(false)}>Sign up</Link>
          </>}
        </div>
      )}
    </nav>
  );
}
