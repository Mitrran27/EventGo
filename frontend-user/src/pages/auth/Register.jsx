import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../lib/api';
import { useAuthStore } from '../../store/authStore';

export default function Register() {
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault(); setLoading(true);
    try {
      const { data } = await api.post('/auth/register', form);
      setAuth(data.data.user, data.data.token);
      toast.success('Account created!');
      navigate('/dashboard');
    } catch (err) { toast.error(err.response?.data?.message || 'Registration failed'); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-brand-500 to-brand-700 items-center justify-center p-12">
        <div className="text-white max-w-md">
          <h1 className="text-5xl font-bold mb-4">event<span className="opacity-70">go</span></h1>
          <p className="text-xl opacity-90 leading-relaxed">Join thousands of event planners discovering top vendors across Malaysia.</p>
        </div>
      </div>
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Create your account</h2>
          <p className="text-gray-500 mb-8">It's free — no credit card required.</p>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div><label className="label">Full name</label><input className="input" type="text" placeholder="Your name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
            <div><label className="label">Email address</label><input className="input" type="email" placeholder="you@example.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></div>
            <div><label className="label">Password</label><input className="input" type="password" placeholder="At least 6 characters" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={6} /></div>
            <button type="submit" disabled={loading} className="btn-primary w-full">{loading ? 'Creating account...' : 'Create account'}</button>
          </form>
          <p className="text-center text-sm text-gray-500 mt-6">Already have an account? <Link to="/login" className="text-brand-500 font-semibold hover:underline">Log in</Link></p>
        </div>
      </div>
    </div>
  );
}
