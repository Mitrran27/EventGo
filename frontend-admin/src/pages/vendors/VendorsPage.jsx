import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, ToggleLeft, ToggleRight, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../lib/api';

const emptyForm = { name: '', categoryId: '', description: '', minPrice: '', maxPrice: '', location: '', imageUrl: '' };

export default function VendorsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const { data, isLoading } = useQuery({
    queryKey: ['adminVendors', { search, page }],
    queryFn: () => api.get('/admin/vendors', { params: { search, page, limit: 15 } }).then(r => r.data.data),
    keepPreviousData: true,
  });
  const { data: catsData } = useQuery({ queryKey: ['adminVCats'], queryFn: () => api.get('/admin/vendor-categories').then(r => r.data.data) });
  const categories = catsData?.categories || [];
  const vendors = data?.vendors || [];

  const openCreate = () => { setForm(emptyForm); setModal('create'); };
  const openEdit = (v) => {
    setForm({ name: v.name, categoryId: v.categoryId, description: v.description || '', minPrice: v.minPrice, maxPrice: v.maxPrice, location: v.location || '', imageUrl: v.imageUrl || '' });
    setModal(v);
  };

  const saveMutation = useMutation({
    mutationFn: () => modal === 'create' ? api.post('/admin/vendors', form) : api.put('/admin/vendors/' + modal.id, form),
    onSuccess: () => { qc.invalidateQueries(['adminVendors']); setModal(null); toast.success(modal === 'create' ? 'Vendor created' : 'Vendor updated'); },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed'),
  });
  const deleteMutation = useMutation({ mutationFn: (id) => api.delete('/admin/vendors/' + id), onSuccess: () => { qc.invalidateQueries(['adminVendors']); toast.success('Deleted'); } });
  const toggleMutation = useMutation({ mutationFn: (id) => api.put('/admin/vendors/' + id + '/toggle'), onSuccess: () => qc.invalidateQueries(['adminVendors']) });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Vendors</h1>
          <p className="text-gray-500 text-sm mt-0.5">{data?.total ?? 0} total</p>
        </div>
        <button onClick={openCreate} className="btn-primary flex items-center gap-2"><Plus size={15} /> Add Vendor</button>
      </div>

      <div className="card">
        <div className="p-4 border-b border-gray-100">
          <div className="relative max-w-xs">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input className="input pl-9 text-sm" placeholder="Search vendors..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="table-th">Vendor</th>
                <th className="table-th">Category</th>
                <th className="table-th">Price Range</th>
                <th className="table-th">Leads</th>
                <th className="table-th">Status</th>
                <th className="table-th">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                <tr><td colSpan={6} className="table-td text-center text-gray-400 py-8">Loading...</td></tr>
              ) : vendors.map(v => (
                <tr key={v.id} className="hover:bg-gray-50">
                  <td className="table-td">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg overflow-hidden bg-gray-100 shrink-0 flex items-center justify-center text-gray-300">
                        {v.imageUrl ? <img src={v.imageUrl} alt={v.name} className="w-full h-full object-cover" /> : '🎪'}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{v.name}</p>
                        {v.location && <p className="text-xs text-gray-400">{v.location}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="table-td"><span className="badge bg-gray-100 text-gray-600">{v.category?.name}</span></td>
                  <td className="table-td text-sm">RM {Number(v.minPrice).toLocaleString()} – {Number(v.maxPrice).toLocaleString()}</td>
                  <td className="table-td font-semibold">{v._count?.leads ?? 0}</td>
                  <td className="table-td">
                    <span className={`badge ${v.isActive ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {v.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="table-td">
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => openEdit(v)} className="w-7 h-7 rounded-md bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600"><Pencil size={12} /></button>
                      <button onClick={() => toggleMutation.mutate(v.id)} className="w-7 h-7 rounded-md bg-gray-100 hover:bg-gray-200 flex items-center justify-center">
                        {v.isActive ? <ToggleRight size={14} className="text-green-600" /> : <ToggleLeft size={14} className="text-gray-400" />}
                      </button>
                      <button onClick={() => { if (window.confirm('Delete this vendor?')) deleteMutation.mutate(v.id); }} className="w-7 h-7 rounded-md bg-red-50 hover:bg-red-100 flex items-center justify-center text-red-500"><Trash2 size={12} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modal !== null && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-gray-900 mb-5">{modal === 'create' ? 'Add Vendor' : 'Edit Vendor'}</h2>
            <div className="space-y-3">
              <div><label className="label">Name *</label><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div>
                <label className="label">Category *</label>
                <select className="input" value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}>
                  <option value="">Select category</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Min Price (RM) *</label><input className="input" type="number" value={form.minPrice} onChange={(e) => setForm({ ...form, minPrice: e.target.value })} /></div>
                <div><label className="label">Max Price (RM) *</label><input className="input" type="number" value={form.maxPrice} onChange={(e) => setForm({ ...form, maxPrice: e.target.value })} /></div>
              </div>
              <div><label className="label">Location</label><input className="input" placeholder="e.g. Kuala Lumpur" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></div>
              <div><label className="label">Image URL</label><input className="input" placeholder="https://..." value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} /></div>
              <div><label className="label">Description</label><textarea className="input resize-none" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setModal(null)} className="btn-secondary flex-1">Cancel</button>
              <button onClick={() => saveMutation.mutate()} disabled={saveMutation.isLoading} className="btn-primary flex-1">
                {saveMutation.isLoading ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
