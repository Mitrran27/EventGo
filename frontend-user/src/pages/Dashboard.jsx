import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { CalendarDays, DollarSign, Heart, ArrowRight, Plus } from 'lucide-react';
import { format } from 'date-fns';
import api from '../lib/api';
import { useAuthStore } from '../store/authStore';

export default function Dashboard() {
  const { user } = useAuthStore();
  const { data: evData } = useQuery({ queryKey: ['events'], queryFn: () => api.get('/events').then(r => r.data.data) });
  const { data: favData } = useQuery({ queryKey: ['favorites'], queryFn: () => api.get('/favorites').then(r => r.data.data) });
  const events = evData?.events || [];
  const favorites = favData?.favorites || [];
  const STATUS_COLOR = { DRAFT: 'bg-gray-100 text-gray-600', ACTIVE: 'bg-green-100 text-green-700', COMPLETED: 'bg-blue-100 text-blue-700' };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-gray-900">Good {new Date().getHours() < 12 ? 'morning' : 'afternoon'}, {user?.name?.split(' ')[0]} 👋</h1>
        <p className="text-gray-500 mt-1">Here's your event planning overview.</p>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
        {[
          { icon: CalendarDays, label: 'Active Events', value: events.filter(e => e.status !== 'COMPLETED').length, color: 'text-brand-500', bg: 'bg-brand-50' },
          { icon: Heart, label: 'Saved Vendors', value: favorites.length, color: 'text-pink-500', bg: 'bg-pink-50' },
          { icon: DollarSign, label: 'Total Budget', value: 'RM ' + events.reduce((s, e) => s + Number(e.totalBudget), 0).toLocaleString(), color: 'text-green-600', bg: 'bg-green-50' },
        ].map(({ icon: Icon, label, value, color, bg }) => (
          <div key={label} className="card p-6">
            <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center mb-3`}><Icon size={20} className={color} /></div>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            <p className="text-sm text-gray-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>
      <div className="mb-10">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-bold text-gray-900">My Events</h2>
          <Link to="/events" className="text-sm text-brand-500 font-semibold flex items-center gap-1 hover:underline">View all <ArrowRight size={14} /></Link>
        </div>
        {events.length === 0 ? (
          <div className="border-2 border-dashed border-gray-200 rounded-2xl p-12 text-center">
            <CalendarDays size={40} className="mx-auto text-gray-300 mb-3" />
            <p className="font-semibold text-gray-700 mb-1">No events yet</p>
            <p className="text-gray-400 text-sm mb-5">Start planning your first event</p>
            <Link to="/events" className="btn-primary inline-flex items-center gap-2"><Plus size={16} /> Create Event</Link>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {events.slice(0, 3).map(ev => (
              <Link key={ev.id} to={'/events/' + ev.id} className="card p-5 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-3">
                  <h3 className="font-semibold text-gray-900 leading-tight">{ev.name}</h3>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLOR[ev.status]}`}>{ev.status}</span>
                </div>
                <p className="text-sm text-gray-500 mb-1">{ev.eventType}</p>
                <p className="text-sm text-gray-500">{format(new Date(ev.eventDate), 'dd MMM yyyy')}</p>
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-500">Budget</span>
                    <span className="font-semibold text-gray-900">RM {Number(ev.totalBudget).toLocaleString()}</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-brand-500 rounded-full" style={{ width: Math.min(100, ((ev.totalSpent || 0) / Number(ev.totalBudget)) * 100) + '%' }} />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
      {favorites.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xl font-bold text-gray-900">Saved Vendors</h2>
            <Link to="/favorites" className="text-sm text-brand-500 font-semibold flex items-center gap-1 hover:underline">View all <ArrowRight size={14} /></Link>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {favorites.slice(0, 4).map(fav => (
              <Link key={fav.id} to={'/vendors/' + fav.vendor.id} className="card overflow-hidden">
                <div className="h-32 bg-gray-100 overflow-hidden">
                  {fav.vendor.imageUrl ? <img src={fav.vendor.imageUrl} alt={fav.vendor.name} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-gradient-to-br from-brand-100 to-brand-200" />}
                </div>
                <div className="p-3"><p className="font-semibold text-sm text-gray-900 truncate">{fav.vendor.name}</p><p className="text-xs text-gray-500">{fav.vendor.category?.name}</p></div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
