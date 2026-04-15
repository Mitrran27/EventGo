import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, UserX, UserCheck, Shield } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import api from '../../lib/api';

export default function UsersPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['adminUsers', { search, page }],
    queryFn: () => api.get('/admin/users', { params: { search, page, limit: 20 } }).then(r => r.data.data),
    keepPreviousData: true,
  });
  const users = data?.users || [];

  const toggleMutation = useMutation({
    mutationFn: (id) => api.put('/admin/users/' + id + '/toggle'),
    onSuccess: () => { qc.invalidateQueries(['adminUsers']); toast.success('Status updated'); },
  });
  const roleMutation = useMutation({
    mutationFn: ({ id, role }) => api.put('/admin/users/' + id + '/role', { role }),
    onSuccess: () => { qc.invalidateQueries(['adminUsers']); toast.success('Role updated'); },
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Users</h1>
          <p className="text-gray-500 text-sm mt-0.5">{data?.total ?? 0} total users</p>
        </div>
      </div>

      <div className="card">
        <div className="p-4 border-b border-gray-100">
          <div className="relative max-w-xs">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input className="input pl-9 text-sm" placeholder="Search users..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="table-th">User</th>
                <th className="table-th">Role</th>
                <th className="table-th">Events</th>
                <th className="table-th">Joined</th>
                <th className="table-th">Status</th>
                <th className="table-th">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}><td colSpan={6} className="table-td"><div className="h-4 bg-gray-100 rounded animate-pulse w-3/4" /></td></tr>
                ))
              ) : users.map(u => (
                <tr key={u.id} className={u.deleted ? 'opacity-50' : 'hover:bg-gray-50'}>
                  <td className="table-td">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center text-xs font-bold shrink-0">
                        {u.name?.[0]?.toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{u.name}</p>
                        <p className="text-xs text-gray-400">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="table-td">
                    <span className={`badge ${u.role === 'ADMIN' ? 'bg-brand-50 text-brand-600' : 'bg-gray-100 text-gray-600'}`}>{u.role}</span>
                  </td>
                  <td className="table-td text-gray-500">{u._count?.events ?? 0}</td>
                  <td className="table-td text-gray-500 text-xs">{format(new Date(u.createdAt), 'dd MMM yyyy')}</td>
                  <td className="table-td">
                    <span className={`badge ${u.deleted ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700'}`}>
                      {u.deleted ? 'Disabled' : 'Active'}
                    </span>
                  </td>
                  <td className="table-td">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleMutation.mutate(u.id)}
                        title={u.deleted ? 'Enable user' : 'Disable user'}
                        className={`w-7 h-7 rounded-md flex items-center justify-center transition-colors ${u.deleted ? 'bg-green-50 text-green-700 hover:bg-green-100' : 'bg-red-50 text-red-600 hover:bg-red-100'}`}
                      >
                        {u.deleted ? <UserCheck size={13} /> : <UserX size={13} />}
                      </button>
                      {u.role !== 'ADMIN' && (
                        <button
                          onClick={() => roleMutation.mutate({ id: u.id, role: 'ADMIN' })}
                          title="Promote to Admin"
                          className="w-7 h-7 rounded-md bg-brand-50 text-brand-600 hover:bg-brand-100 flex items-center justify-center"
                        >
                          <Shield size={12} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {data?.total > 20 && (
          <div className="p-4 border-t border-gray-100 flex justify-between items-center">
            <p className="text-xs text-gray-500">Showing {users.length} of {data.total}</p>
            <div className="flex gap-2">
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="btn-secondary text-xs py-1.5 px-3 disabled:opacity-40">Prev</button>
              <button disabled={users.length < 20} onClick={() => setPage(p => p + 1)} className="btn-secondary text-xs py-1.5 px-3 disabled:opacity-40">Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
