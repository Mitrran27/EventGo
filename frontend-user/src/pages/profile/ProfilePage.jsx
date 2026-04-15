import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../../lib/api';
import { useAuthStore } from '../../store/authStore';

export default function ProfilePage() {
  const { setAuth, user: storeUser } = useAuthStore();
  const [name, setName] = useState('');
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '' });

  const { data } = useQuery({ queryKey: ['profile'], queryFn: () => api.get('/users/profile').then(r => r.data.data), onSuccess: (d) => setName(d.user.name) });
  const user = data?.user;

  const updateMutation = useMutation({
    mutationFn: () => api.put('/users/profile', { name }),
    onSuccess: (res) => { toast.success('Profile updated'); setAuth({ ...storeUser, name: res.data.data.user.name }, localStorage.getItem('token')); },
  });
  const pwMutation = useMutation({
    mutationFn: () => api.put('/auth/change-password', pwForm),
    onSuccess: () => { toast.success('Password changed'); setPwForm({ currentPassword: '', newPassword: '' }); },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed'),
  });

  if (!user) return <div className="max-w-2xl mx-auto px-6 py-12 text-center text-gray-400">Loading...</div>;

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Profile</h1>
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[{ label: 'Events', value: user._count?.events || 0 }, { label: 'Favourites', value: user._count?.favorites || 0 }, { label: 'Inquiries', value: user._count?.contactRequests || 0 }].map(({ label, value }) => (
          <div key={label} className="card p-4 text-center"><p className="text-2xl font-bold text-gray-900">{value}</p><p className="text-xs text-gray-500 mt-0.5">{label}</p></div>
        ))}
      </div>
      <div className="card p-6 mb-6">
        <h2 className="text-lg font-bold text-gray-900 mb-5">Personal Information</h2>
        <div className="space-y-4">
          <div><label className="label">Full Name</label><input className="input" value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div><label className="label">Email Address</label><input className="input bg-gray-50 cursor-not-allowed" value={user.email} disabled /></div>
        </div>
        <button onClick={() => updateMutation.mutate()} disabled={updateMutation.isLoading} className="btn-primary mt-5">{updateMutation.isLoading ? 'Saving...' : 'Save Changes'}</button>
      </div>
      <div className="card p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-5">Change Password</h2>
        <div className="space-y-4">
          <div><label className="label">Current Password</label><input className="input" type="password" value={pwForm.currentPassword} onChange={(e) => setPwForm({ ...pwForm, currentPassword: e.target.value })} /></div>
          <div><label className="label">New Password</label><input className="input" type="password" value={pwForm.newPassword} onChange={(e) => setPwForm({ ...pwForm, newPassword: e.target.value })} /></div>
        </div>
        <button onClick={() => pwMutation.mutate()} disabled={pwMutation.isLoading} className="btn-primary mt-5">{pwMutation.isLoading ? 'Updating...' : 'Update Password'}</button>
      </div>
    </div>
  );
}
