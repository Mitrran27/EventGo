import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, Store, Tag, TrendingUp, Mail, ScrollText } from 'lucide-react';
import logo from '../../assets/logo.png';  // ← go up TWO levels

const nav = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/users',     icon: Users,           label: 'Users' },
  { to: '/vendors',   icon: Store,           label: 'Vendors' },
  { to: '/categories',icon: Tag,             label: 'Categories' },
  { to: '/leads',     icon: TrendingUp,      label: 'Leads' },
  { to: '/contacts',  icon: Mail,            label: 'Contact Requests' },
  { to: '/logs',      icon: ScrollText,      label: 'Admin Logs' },
];
export default function Sidebar() {
  return (
    <aside className="w-56 bg-white border-r border-gray-200 flex flex-col shrink-0">
      <div className="h-16 flex items-center px-5 border-b border-gray-200">
        {/* <span className="text-brand-500 font-bold text-lg">event<span className="text-gray-900">go</span></span> */}
          <img src={logo} alt="EventGo" className="h-14 w-auto mx-auto"/>
        <span className="ml-2 text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-medium">Admin</span>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {nav.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to} className={({ isActive }) =>
            'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ' +
            (isActive ? 'bg-brand-50 text-brand-600' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900')
          }>
            <Icon size={17} />{label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
