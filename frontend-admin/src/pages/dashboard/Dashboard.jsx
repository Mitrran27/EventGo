import { useQuery } from '@tanstack/react-query';
import { Users, Store, TrendingUp, Mail, CalendarDays } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import api from '../../lib/api';

const StatCard = ({ icon: Icon, label, value, color, bg }) => (
  <div className="stat-card flex items-center gap-4">
    <div className={`w-12 h-12 rounded-xl ${bg} flex items-center justify-center shrink-0`}>
      <Icon size={22} className={color} />
    </div>
    <div>
      <p className="text-2xl font-bold text-gray-900">{value ?? '—'}</p>
      <p className="text-sm text-gray-500">{label}</p>
    </div>
  </div>
);

export default function Dashboard() {
  const { data, isLoading } = useQuery({ queryKey: ['adminDashboard'], queryFn: () => api.get('/admin/dashboard').then(r => r.data.data) });
  if (isLoading) return <div className="text-gray-400 text-sm">Loading dashboard...</div>;

  const { stats = {}, leadsByType = [], topVendors = [] } = data || {};
  const COLORS = { VIEW: '#3B82F6', CONTACT: '#FF5A5F', FAVORITE: '#EC4899' };
  const chartData = leadsByType.map(l => ({ name: l.actionType, count: l._count }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-0.5">Platform overview</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard icon={Users}       label="Users"       value={stats.users}    color="text-blue-600"   bg="bg-blue-50"   />
        <StatCard icon={CalendarDays}label="Events"      value={stats.events}   color="text-purple-600" bg="bg-purple-50" />
        <StatCard icon={Store}       label="Vendors"     value={stats.vendors}  color="text-brand-500"  bg="bg-brand-50"  />
        <StatCard icon={TrendingUp}  label="Total Leads" value={stats.leads}    color="text-green-600"  bg="bg-green-50"  />
        <StatCard icon={Mail}        label="Inquiries"   value={stats.contacts} color="text-orange-500" bg="bg-orange-50" />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="card p-5">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Leads by Type</h2>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData} barSize={44}>
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#6B7280' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: '#6B7280' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #E5E7EB', fontSize: 12 }} />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {chartData.map(e => <Cell key={e.name} fill={COLORS[e.name] || '#FF5A5F'} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="text-gray-400 text-sm text-center py-10">No lead data yet</p>}
        </div>

        <div className="card p-5">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Top Vendors by Leads</h2>
          <div className="space-y-3">
            {topVendors.length === 0
              ? <p className="text-gray-400 text-sm text-center py-10">No data yet</p>
              : topVendors.map((v, i) => (
                <div key={v.id} className="flex items-center gap-3">
                  <span className="text-xs font-bold text-gray-400 w-4">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{v.name}</p>
                    <div className="h-1.5 bg-gray-100 rounded-full mt-1 overflow-hidden">
                      <div className="h-full bg-brand-500 rounded-full" style={{ width: `${Math.min(100, (v._count.leads / (topVendors[0]?._count?.leads || 1)) * 100)}%` }} />
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-gray-600 shrink-0">{v._count.leads}</span>
                </div>
              ))
            }
          </div>
        </div>
      </div>
    </div>
  );
}
