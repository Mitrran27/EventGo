import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ScrollText } from 'lucide-react';
import api from '../../lib/api';

const ACTION_COLOR = {
  CREATE_VENDOR: 'bg-green-50 text-green-700',
  UPDATE_VENDOR: 'bg-blue-50 text-blue-700',
  DELETE_VENDOR: 'bg-red-50 text-red-600',
  DISABLE_USER:  'bg-orange-50 text-orange-700',
  ENABLE_USER:   'bg-green-50 text-green-700',
  CHANGE_ROLE:   'bg-purple-50 text-purple-700',
};

export default function LogsPage() {
  const { data, isLoading } = useQuery({ queryKey: ['adminLogs'], queryFn: () => api.get('/admin/logs').then(r => r.data.data) });
  const logs = data?.logs || [];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Admin Logs</h1>
        <p className="text-gray-500 text-sm mt-0.5">Recent administrative actions (last 100)</p>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="table-th">Action</th>
              <th className="table-th">Target</th>
              <th className="table-th">Admin</th>
              <th className="table-th">Date & Time</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}><td colSpan={4} className="table-td"><div className="h-4 bg-gray-100 rounded animate-pulse w-1/2" /></td></tr>
              ))
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={4} className="table-td text-center py-16">
                  <ScrollText size={40} className="mx-auto text-gray-200 mb-3" />
                  <p className="text-gray-400 text-sm">No admin actions recorded yet</p>
                </td>
              </tr>
            ) : logs.map(log => (
              <tr key={log.id} className="hover:bg-gray-50">
                <td className="table-td">
                  <span className={`badge ${ACTION_COLOR[log.action] || 'bg-gray-100 text-gray-600'}`}>
                    {log.action.replace(/_/g, ' ')}
                  </span>
                </td>
                <td className="table-td">
                  <p className="text-sm capitalize text-gray-700">{log.targetType}</p>
                  {log.targetId && <p className="text-xs text-gray-400 font-mono">{log.targetId.slice(0, 8)}…</p>}
                </td>
                <td className="table-td">
                  <p className="text-sm font-medium">{log.admin?.name || '—'}</p>
                </td>
                <td className="table-td text-xs text-gray-500">
                  {format(new Date(log.createdAt), 'dd MMM yyyy, HH:mm')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
