import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Mail, Calendar, User, Store } from 'lucide-react';
import { format } from 'date-fns';
import api from '../../lib/api';

export default function ContactsPage() {
  const [vendorId, setVendorId] = useState('');
  const [page, setPage] = useState(1);

  const { data: vendorsData } = useQuery({ queryKey: ['adminVendorsMin'], queryFn: () => api.get('/admin/vendors', { params: { limit: 100 } }).then(r => r.data.data) });
  const { data, isLoading } = useQuery({
    queryKey: ['adminContacts', { vendorId, page }],
    queryFn: () => api.get('/admin/contacts', { params: { vendorId, page, limit: 20 } }).then(r => r.data.data),
    keepPreviousData: true,
  });

  const contacts = data?.contacts || [];
  const vendors = vendorsData?.vendors || [];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Contact Requests</h1>
        <p className="text-gray-500 text-sm mt-0.5">{data?.total ?? 0} total inquiries</p>
      </div>

      {/* Filter */}
      <div className="flex gap-3">
        <select className="input w-auto text-sm" value={vendorId} onChange={(e) => { setVendorId(e.target.value); setPage(1); }}>
          <option value="">All Vendors</option>
          {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
        </select>
        {vendorId && <button onClick={() => { setVendorId(''); setPage(1); }} className="btn-secondary text-xs py-1.5 px-3">Clear</button>}
      </div>

      {/* Cards */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="card p-5 animate-pulse"><div className="h-4 bg-gray-100 rounded w-1/2 mb-2" /><div className="h-3 bg-gray-100 rounded w-3/4" /></div>)}
        </div>
      ) : contacts.length === 0 ? (
        <div className="card p-16 text-center">
          <Mail size={40} className="mx-auto text-gray-200 mb-3" />
          <p className="text-gray-400 text-sm">No contact requests found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {contacts.map(c => (
            <div key={c.id} className="card p-5">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 text-sm">
                    <User size={14} className="text-gray-400 shrink-0" />
                    <div>
                      <span className="font-medium text-gray-900">{c.user?.name}</span>
                      <span className="text-gray-400 ml-1 text-xs">({c.user?.email})</span>
                    </div>
                  </div>
                  <span className="text-gray-300">→</span>
                  <div className="flex items-center gap-2 text-sm">
                    <Store size={14} className="text-gray-400 shrink-0" />
                    <span className="font-medium text-gray-900">{c.vendor?.name}</span>
                  </div>
                </div>
                <span className="text-xs text-gray-400 flex items-center gap-1 shrink-0">
                  <Calendar size={11} /> {format(new Date(c.createdAt), 'dd MMM yyyy, HH:mm')}
                </span>
              </div>
              {c.event && (
                <p className="text-xs text-brand-500 font-medium mb-2 bg-brand-50 inline-block px-2 py-0.5 rounded-full">
                  Event: {c.event.name}
                </p>
              )}
              <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-700 leading-relaxed">{c.message}</div>
              <p className="text-xs text-gray-400 mt-2">Reply to: <span className="text-gray-600">{c.contactEmail}</span></p>
            </div>
          ))}
        </div>
      )}

      {data?.total > 20 && (
        <div className="flex justify-between items-center">
          <p className="text-xs text-gray-500">Showing {contacts.length} of {data.total}</p>
          <div className="flex gap-2">
            <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="btn-secondary text-xs py-1.5 px-3 disabled:opacity-40">Prev</button>
            <button disabled={contacts.length < 20} onClick={() => setPage(p => p + 1)} className="btn-secondary text-xs py-1.5 px-3 disabled:opacity-40">Next</button>
          </div>
        </div>
      )}
    </div>
  );
}
