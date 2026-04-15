import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../lib/api';
import { useAuthStore } from '../store/authStore';
export default function LoginPage() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();
  const handleSubmit = async (e) => {
    e.preventDefault(); setLoading(true);
    try {
      const { data } = await api.post('/auth/login', form);
      if (data.data.user.role !== 'ADMIN') { toast.error('Admin access only'); setLoading(false); return; }
      setAuth(data.data.user, data.data.token);
      toast.success('Welcome back!');
      navigate('/dashboard');
    } catch (err) { toast.error(err.response?.data?.message || 'Invalid credentials'); }
    finally { setLoading(false); }
  };
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold"><span className="text-brand-500">event</span>go</h1>
          <p className="text-gray-500 text-sm mt-1">Admin Portal</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div><label className="label">Email</label><input className="input" type="email" placeholder="admin@eventgo.my" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></div>
          <div><label className="label">Password</label><input className="input" type="password" placeholder="••••••••" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required /></div>
          <button type="submit" disabled={loading} className="btn-primary w-full py-2.5">{loading ? 'Signing in...' : 'Sign In'}</button>
        </form>
      </div>
    </div>
  );
}
