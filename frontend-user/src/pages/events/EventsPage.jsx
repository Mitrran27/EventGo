import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Plus, CalendarDays, Trash2, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import api from '../../lib/api';

const STATUS_COLORS = { DRAFT: 'bg-gray-100 text-gray-600', ACTIVE: 'bg-green-100 text-green-700', COMPLETED: 'bg-blue-100 text-blue-700' };

export default function EventsPage() {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', eventType: '', eventDate: '', totalBudget: '' });

  const { data, isLoading } = useQuery({ queryKey: ['events'], queryFn: () => api.get('/events').then(r => r.data.data) });
  const events = data?.events || [];

  const createMutation = useMutation({
    mutationFn: () => api.post('/events', form),
    onSuccess: () => { qc.invalidateQueries(['events']); setShowModal(false); setForm({ name: '', eventType: '', eventDate: '', totalBudget: '' }); toast.success('Event created!'); },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed'),
  });
  const deleteMutation = useMutation({ mutationFn: (id) => api.delete('/events/' + id), onSuccess: () => { qc.invalidateQueries(['events']); toast.success('Event deleted'); } });

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <div><h1 className="text-3xl font-bold text-gray-900">My Events</h1><p className="text-gray-500 mt-1">{events.length} total events</p></div>
        <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2"><Plus size={18} /> New Event</button>
      </div>
      {isLoading ? <div className="text-center py-20 text-gray-400">Loading...</div>
       : events.length === 0 ? (
        <div className="border-2 border-dashed border-gray-200 rounded-2xl p-16 text-center">
          <CalendarDays size={48} className="mx-auto text-gray-200 mb-4" />
          <p className="font-semibold text-gray-700 mb-1">No events yet</p>
          <p className="text-gray-400 text-sm mb-6">Create your first event to start planning</p>
          <button onClick={() => setShowModal(true)} className="btn-primary inline-flex items-center gap-2"><Plus size={16} /> Create Event</button>
        </div>
      ) : (
        <div className="space-y-3">
          {events.map(ev => (
            <div key={ev.id} className="card p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-brand-50 flex items-center justify-center shrink-0"><CalendarDays size={22} className="text-brand-500" /></div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <h3 className="font-semibold text-gray-900 truncate">{ev.name}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[ev.status]}`}>{ev.status}</span>
                </div>
                <p className="text-sm text-gray-500">{ev.eventType} · {format(new Date(ev.eventDate), 'dd MMM yyyy')}</p>
              </div>
              <div className="text-right shrink-0 hidden sm:block">
                <p className="font-semibold text-gray-900">RM {Number(ev.totalBudget).toLocaleString()}</p>
                {ev.remaining !== undefined && <p className="text-xs text-gray-400">RM {ev.remaining?.toLocaleString()} left</p>}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Link to={'/events/' + ev.id} className="w-9 h-9 rounded-xl border border-gray-200 flex items-center justify-center hover:border-gray-400 text-gray-500"><ChevronRight size={16} /></Link>
                <button onClick={() => deleteMutation.mutate(ev.id)} className="w-9 h-9 rounded-xl border border-gray-200 flex items-center justify-center hover:border-red-300 hover:text-red-500 text-gray-400"><Trash2 size={15} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h2 className="text-xl font-bold text-gray-900 mb-5">Create New Event</h2>
            <div className="space-y-4">
              <div><label className="label">Event Name</label><input className="input" placeholder="e.g. Sarah & John Wedding" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div><label className="label">Event Type</label>
                <select className="input" value={form.eventType} onChange={(e) => setForm({ ...form, eventType: e.target.value })}>
                  <option value="">Select type</option>
                  {['Wedding','Birthday','Corporate','Anniversary','Graduation','Other'].map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div><label className="label">Event Date</label><input className="input" type="date" value={form.eventDate} onChange={(e) => setForm({ ...form, eventDate: e.target.value })} /></div>
              <div><label className="label">Total Budget (RM)</label><input className="input" type="number" placeholder="e.g. 20000" value={form.totalBudget} onChange={(e) => setForm({ ...form, totalBudget: e.target.value })} /></div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowModal(false)} className="btn-secondary flex-1">Cancel</button>
              <button onClick={() => createMutation.mutate()} disabled={createMutation.isLoading} className="btn-primary flex-1">{createMutation.isLoading ? 'Creating...' : 'Create Event'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
