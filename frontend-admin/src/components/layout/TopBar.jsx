import { useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
export default function TopBar() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 shrink-0">
      <div />
      <div className="flex items-center gap-4">
        <div className="text-right">
          <p className="text-sm font-semibold text-gray-900 leading-none">{user?.name}</p>
          <p className="text-xs text-gray-400 mt-0.5">Administrator</p>
        </div>
        <div className="w-8 h-8 rounded-full bg-brand-500 text-white flex items-center justify-center text-sm font-bold">{user?.name?.[0]?.toUpperCase()}</div>
        <button onClick={() => { logout(); navigate('/login'); }} className="text-gray-400 hover:text-gray-600"><LogOut size={17} /></button>
      </div>
    </header>
  );
}
