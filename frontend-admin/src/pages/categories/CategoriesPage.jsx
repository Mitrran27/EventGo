import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, X, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../lib/api';

function CategorySection({ title, fetchUrl, createUrl, updateUrl, deleteUrl, queryKey }) {
  const qc = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');

  const { data, isLoading } = useQuery({ queryKey: [queryKey], queryFn: () => api.get(fetchUrl).then(r => r.data.data) });
  const cats = data?.categories || [];

  const createMutation = useMutation({
    mutationFn: () => api.post(createUrl, { name: newName }),
    onSuccess: () => { qc.invalidateQueries([queryKey]); setAdding(false); setNewName(''); toast.success('Category added'); },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed'),
  });

  const updateMutation = useMutation({
    mutationFn: (id) => api.put(updateUrl + '/' + id, { name: editName }),
    onSuccess: () => { qc.invalidateQueries([queryKey]); setEditingId(null); toast.success('Updated'); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(deleteUrl + '/' + id),
    onSuccess: () => { qc.invalidateQueries([queryKey]); toast.success('Deleted'); },
  });

  return (
    <div className="card">
      <div className="p-5 border-b border-gray-100 flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-900">{title}</h2>
        <button onClick={() => setAdding(true)} className="btn-primary flex items-center gap-1.5 text-xs py-1.5 px-3">
          <Plus size={13} /> Add
        </button>
      </div>
      <div className="divide-y divide-gray-50">
        {adding && (
          <div className="flex items-center gap-2 p-3">
            <input autoFocus className="input text-sm flex-1" placeholder="Category name..." value={newName}
              onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && createMutation.mutate()} />
            <button onClick={() => createMutation.mutate()} disabled={!newName.trim()} className="w-8 h-8 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 flex items-center justify-center"><Check size={14} /></button>
            <button onClick={() => { setAdding(false); setNewName(''); }} className="w-8 h-8 rounded-lg bg-gray-100 text-gray-500 flex items-center justify-center"><X size={14} /></button>
          </div>
        )}
        {isLoading ? <div className="p-6 text-sm text-gray-400 text-center">Loading...</div>
         : cats.length === 0 ? <div className="p-8 text-sm text-gray-400 text-center">No categories yet</div>
         : cats.map(cat => (
          <div key={cat.id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50">
            {editingId === cat.id ? (
              <>
                <input autoFocus className="input text-sm flex-1 py-1.5" value={editName}
                  onChange={(e) => setEditName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && updateMutation.mutate(cat.id)} />
                <button onClick={() => updateMutation.mutate(cat.id)} className="w-7 h-7 rounded-md bg-green-50 text-green-600 flex items-center justify-center hover:bg-green-100"><Check size={12} /></button>
                <button onClick={() => setEditingId(null)} className="w-7 h-7 rounded-md bg-gray-100 text-gray-500 flex items-center justify-center"><X size={12} /></button>
              </>
            ) : (
              <>
                <span className="flex-1 text-sm text-gray-800">{cat.name}</span>
                <button onClick={() => { setEditingId(cat.id); setEditName(cat.name); }} className="w-7 h-7 rounded-md bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500"><Pencil size={12} /></button>
                <button onClick={() => { if (window.confirm('Delete "' + cat.name + '"?')) deleteMutation.mutate(cat.id); }} className="w-7 h-7 rounded-md bg-red-50 hover:bg-red-100 flex items-center justify-center text-red-500"><Trash2 size={12} /></button>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function CategoriesPage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Categories</h1>
        <p className="text-gray-500 text-sm mt-0.5">Manage vendor and expense categories</p>
      </div>
      <div className="grid lg:grid-cols-2 gap-6">
        <CategorySection title="Vendor Categories" fetchUrl="/admin/vendor-categories" createUrl="/admin/vendor-categories" updateUrl="/admin/vendor-categories" deleteUrl="/admin/vendor-categories" queryKey="adminVCats" />
        <CategorySection title="Expense Categories" fetchUrl="/admin/expense-categories" createUrl="/admin/expense-categories" updateUrl="/admin/expense-categories" deleteUrl="/admin/expense-categories" queryKey="adminECats" />
      </div>
    </div>
  );
}
