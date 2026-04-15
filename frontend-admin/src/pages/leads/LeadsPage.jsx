import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Eye, Phone, Heart, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import api from '../../lib/api';

const ACTION_META = {
  VIEW:     { icon: Eye,     label: 'View',     color: 'text-blue-600',  bg: 'bg-blue-50',  bar: '#3B82F6' },
  CONTACT:  { icon: Phone,   label: 'Contact',  color: 'text-brand-500', bg: 'bg-brand-50', bar: '#FF5A5F' },
  FAVORITE: { icon: Heart,   label: 'Favourite',color: 'text-pink-500',  bg: 'bg-pink-50',  bar: '#EC4899' },
};

export default function LeadsPage() {
  const [actionType, setActionType] = useState('');
  const [vendorId, setVendorId] = useState('');
  const [page, setPage] = useState(1);

  const { data: summaryData } = useQuery({ queryKey: ['leadsSummary'], queryFn: () => api.get('/admin/leads/summary').then(r => r.data.data) });
  const { data, isLoading } = useQuery({
    queryKey: ['adminLeads', { actionType, vendorId, page }],
    queryFn: () => api.get('/admin/leads', { params: { actionType, vendorId, page, limit: 25 } }).then(r => r.data.data),
    keepPreviousData: true,
  });

  const leads = data?.leads || [];
  const summary = summaryData?.summary || [];
  const topVendors = summary.slice(0, 8);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Lead Monitoring</h1>
        <p className="text-gray-500 text-sm mt-0.5">Track all vendor interactions and engagement</p>
      </div>

      {/* Summary chart */}
      {topVendors.length > 0 && (
        <div className="card p-5">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Lead Count by Vendor</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={topVendors} barSize={32}>
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} interval={0} angle={-20} textAnchor="end" height={50} />
              <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #E5E7EB', fontSize: 12 }} formatter={(v) => [v, 'Leads']} />
              <Bar dataKey="total" radius={[5, 5, 0, 0]} fill="#FF5A5F" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Filters */}
      <div className="card p-4 flex flex-wrap gap-3">
        <select className="input w-auto text-sm" value={actionType} onChange={(e) => { setActionType(e.target.value); setPage(1); }}>
          <option value="">All Types</option>
          <option value="VIEW">View</option>
          <option value="CONTACT">Contact</option>
          <option value="FAVORITE">Favourite</option>
        </select>
        <select className="input w-auto text-sm" value={vendorId} onChange={(e) => { setVendorId(e.target.value); setPage(1); }}>
          <option value="">All Vendors</option>
          {summary.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
        </select>
        {(actionType || vendorId) && (
          <button onClick={() => { setActionType(''); setVendorId(''); setPage(1); }} className="btn-secondary text-xs py-1.5 px-3">Clear</button>
        )}
        <span className="ml-auto text-sm text-gray-500 self-center">{data?.total ?? 0} records</span>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="table-th">Type</th>
              <th className="table-th">Vendor</th>
              <th className="table-th">User</th>
              <th className="table-th">Date & Time</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i}><td colSpan={4} className="table-td"><div className="h-4 bg-gray-100 rounded animate-pulse w-2/3" /></td></tr>
              ))
            ) : leads.length === 0 ? (
              <tr><td colSpan={4} className="table-td text-center text-gray-400 py-12">No leads found</td></tr>
            ) : leads.map(lead => {
              const meta = ACTION_META[lead.actionType] || ACTION_META.VIEW;
              const Icon = meta.icon;
              return (
                <tr key={lead.id} className="hover:bg-gray-50">
                  <td className="table-td">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${meta.bg} ${meta.color}`}>
                      <Icon size={11} /> {meta.label}
                    </span>
                  </td>
                  <td className="table-td font-medium text-sm">{lead.vendor?.name || '—'}</td>
                  <td className="table-td">
                    <p className="text-sm">{lead.user?.name || '—'}</p>
                    <p className="text-xs text-gray-400">{lead.user?.email}</p>
                  </td>
                  <td className="table-td text-xs text-gray-500">{format(new Date(lead.createdAt), 'dd MMM yyyy, HH:mm')}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {data?.total > 25 && (
          <div className="p-4 border-t border-gray-100 flex justify-between items-center">
            <p className="text-xs text-gray-500">Showing {leads.length} of {data.total}</p>
            <div className="flex gap-2">
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="btn-secondary text-xs py-1.5 px-3 disabled:opacity-40">Prev</button>
              <button disabled={leads.length < 25} onClick={() => setPage(p => p + 1)} className="btn-secondary text-xs py-1.5 px-3 disabled:opacity-40">Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
