import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../lib/api';
import { useAuthStore } from '../../store/authStore';

export default function Login() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault(); setLoading(true);
    try {
      const { data } = await api.post('/auth/login', form);
      setAuth(data.data.user, data.data.token);
      toast.success('Welcome back!');
      navigate('/dashboard');
    } catch (err) { toast.error(err.response?.data?.message || 'Login failed'); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-brand-500 to-brand-700 items-center justify-center p-12">
        <div className="text-white max-w-md">
          <h1 className="text-5xl font-bold mb-4">event<span className="opacity-70">go</span></h1>
          <p className="text-xl opacity-90 leading-relaxed">Plan your perfect wedding, party, or corporate event — all in one place.</p>
        </div>
      </div>
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Welcome back</h2>
          <p className="text-gray-500 mb-8">Log in to your EventGo account</p>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div><label className="label">Email address</label><input className="input" type="email" placeholder="you@example.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></div>
            <div><label className="label">Password</label><input className="input" type="password" placeholder="••••••••" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required /></div>
            <button type="submit" disabled={loading} className="btn-primary w-full">{loading ? 'Logging in...' : 'Log in'}</button>
          </form>
          <p className="text-center text-sm text-gray-500 mt-6">Don't have an account? <Link to="/register" className="text-brand-500 font-semibold hover:underline">Sign up</Link></p>
        </div>
      </div>
    </div>
  );
}
