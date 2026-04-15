import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Plus, Trash2, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import api from '../../lib/api';

export default function EventDetailPage() {
  const { id } = useParams();
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ categoryId: '', title: '', estimatedAmount: '', actualAmount: '' });

  const { data, isLoading } = useQuery({ queryKey: ['event', id], queryFn: () => api.get('/events/' + id).then(r => r.data.data) });
  const { data: catsData } = useQuery({ queryKey: ['expenseCats'], queryFn: () => api.get('/categories/expenses').then(r => r.data.data) });
  const event = data?.event;
  const categories = catsData?.categories || [];

  const addMutation = useMutation({
    mutationFn: () => api.post('/events/' + id + '/expenses', form),
    onSuccess: () => { qc.invalidateQueries(['event', id]); setShowModal(false); setForm({ categoryId: '', title: '', estimatedAmount: '', actualAmount: '' }); toast.success('Expense added'); },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed'),
  });
  const deleteMutation = useMutation({ mutationFn: (expId) => api.delete('/events/' + id + '/expenses/' + expId), onSuccess: () => { qc.invalidateQueries(['event', id]); toast.success('Removed'); } });

  if (isLoading) return <div className="max-w-4xl mx-auto px-6 py-12 text-center text-gray-400">Loading...</div>;
  if (!event) return <div className="text-center py-20 text-gray-400">Event not found</div>;

  const spent = event.totalSpent || 0;
  const budget = Number(event.totalBudget);
  const pct = Math.min(100, (spent / budget) * 100);
  const isOver = spent > budget;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <Link to="/events" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-6"><ArrowLeft size={16} /> My Events</Link>
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{event.name}</h1>
          <p className="text-gray-500 mt-1">{event.eventType} · {format(new Date(event.eventDate), 'EEEE, dd MMMM yyyy')}</p>
        </div>
        <span className={`text-sm px-3 py-1 rounded-full font-medium ${event.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : event.status === 'COMPLETED' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>{event.status}</span>
      </div>
      <div className="card p-6 mb-8">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Budget Overview</h2>
        <div className="grid grid-cols-3 gap-4 mb-5">
          {[{ label: 'Total Budget', value: 'RM ' + budget.toLocaleString(), color: 'text-gray-900' }, { label: 'Total Spent', value: 'RM ' + spent.toLocaleString(), color: isOver ? 'text-red-600' : 'text-gray-900' }, { label: 'Remaining', value: 'RM ' + (budget - spent).toLocaleString(), color: isOver ? 'text-red-600' : 'text-green-600' }].map(({ label, value, color }) => (
            <div key={label} className="text-center"><p className={'text-2xl font-bold ' + color}>{value}</p><p className="text-xs text-gray-500 mt-0.5">{label}</p></div>
          ))}
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div className={'h-full rounded-full transition-all ' + (isOver ? 'bg-red-500' : pct > 80 ? 'bg-yellow-500' : 'bg-green-500')} style={{ width: pct + '%' }} />
        </div>
        {isOver && <p className="text-xs text-red-600 mt-2 font-medium">⚠ Over budget by RM {(spent - budget).toLocaleString()}</p>}
      </div>
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900">Expenses ({event.expenses?.length || 0})</h2>
          <button onClick={() => setShowModal(true)} className="btn-primary text-sm py-2 flex items-center gap-2"><Plus size={16} /> Add Expense</button>
        </div>
        {event.expenses?.length === 0 ? (
          <div className="border-2 border-dashed border-gray-200 rounded-2xl p-10 text-center">
            <p className="text-gray-400 mb-3">No expenses yet</p>
            <button onClick={() => setShowModal(true)} className="text-brand-500 font-semibold text-sm hover:underline">+ Add first expense</button>
          </div>
        ) : (
          <div className="space-y-2">
            {event.expenses.map(exp => (
              <div key={exp.id} className="flex items-center gap-4 p-4 border border-gray-100 rounded-xl hover:border-gray-200">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{exp.title}</p>
                  <p className="text-xs text-gray-500">{exp.category?.name}</p>
                </div>
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-semibold text-gray-900">RM {Number(exp.estimatedAmount).toLocaleString()} <span className="text-xs text-gray-400">est.</span></p>
                  {exp.actualAmount && <p className="text-xs text-green-600 flex items-center gap-1 justify-end"><Check size={10} /> RM {Number(exp.actualAmount).toLocaleString()} actual</p>}
                </div>
                <button onClick={() => deleteMutation.mutate(exp.id)} className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center hover:border-red-300 hover:text-red-500 text-gray-400 shrink-0"><Trash2 size={13} /></button>
              </div>
            ))}
          </div>
        )}
      </div>
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h2 className="text-xl font-bold text-gray-900 mb-5">Add Expense</h2>
            <div className="space-y-4">
              <div><label className="label">Category</label>
                <select className="input" value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}>
                  <option value="">Select category</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div><label className="label">Title</label><input className="input" placeholder="e.g. Hall booking deposit" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
              <div><label className="label">Estimated Amount (RM)</label><input className="input" type="number" placeholder="0.00" value={form.estimatedAmount} onChange={(e) => setForm({ ...form, estimatedAmount: e.target.value })} /></div>
              <div><label className="label">Actual Amount (RM) <span className="text-gray-400 font-normal">optional</span></label><input className="input" type="number" placeholder="0.00" value={form.actualAmount} onChange={(e) => setForm({ ...form, actualAmount: e.target.value })} /></div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowModal(false)} className="btn-secondary flex-1">Cancel</button>
              <button onClick={() => addMutation.mutate()} disabled={addMutation.isLoading} className="btn-primary flex-1">{addMutation.isLoading ? 'Adding...' : 'Add Expense'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
